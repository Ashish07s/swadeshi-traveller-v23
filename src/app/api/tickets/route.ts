import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "inventory";
    if (type === "inventory") {
      const data = await prisma.ticketInventory.findMany({ include: { allocations: { include: { booking: { select: { bookingCode: true, customerName: true } }, passenger: true } } }, orderBy: { travelDate: "asc" } });
      return NextResponse.json({ data, success: true });
    }
    if (type === "allocations") {
      const data = await prisma.ticketAllocation.findMany({ include: { ticket: true, booking: { select: { bookingCode: true, customerName: true, tripName: true } }, passenger: true }, orderBy: { createdAt: "desc" } });
      return NextResponse.json({ data, success: true });
    }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (body.type === "add-inventory") {
      const code = "TKT-INV-" + String(Math.floor(Math.random()*9000)+1000);
      const ticket = await prisma.ticketInventory.create({ data: { inventoryCode: code, travelMode: body.travelMode||"Train", operator: body.operator||null, trainFlightNo: body.trainFlightNo||null, fromLocation: body.fromLocation, toLocation: body.toLocation, travelDate: new Date(body.travelDate), returnDate: body.returnDate?new Date(body.returnDate):null, departureTime: body.departureTime||null, arrivalTime: body.arrivalTime||null, coachClass: body.coachClass||null, totalSeats: Number(body.totalSeats)||1, availableSeats: Number(body.totalSeats)||1, costPrice: Number(body.costPrice), sellingPrice: Number(body.sellingPrice), pnrNumber: body.pnrNumber||null, notes: body.notes||null, bookedBy: session.user.name } });
      return NextResponse.json({ data: ticket, success: true }, { status: 201 });
    }
    if (body.type === "allocate") {
      const { ticketId, bookingId, passengerId, seatNumber, coachNumber, pnrNumber } = body;
      const ticket = await prisma.ticketInventory.findUnique({ where: { id: ticketId } });
      if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      if (ticket.availableSeats < 1) return NextResponse.json({ error: "No seats available" }, { status: 400 });
      const alloc = await prisma.$transaction(async (tx) => {
        const a = await tx.ticketAllocation.create({ data: { ticketId, bookingId, passengerId: passengerId||null, seatNumber: seatNumber||null, coachNumber: coachNumber||null, pnrNumber: pnrNumber||ticket.pnrNumber||null, costPrice: ticket.costPrice, sellingPrice: ticket.sellingPrice, allocatedBy: session.user.name, status: "Allocated" } });
        const newAvail = ticket.availableSeats - 1;
        await tx.ticketInventory.update({ where: { id: ticketId }, data: { availableSeats: newAvail, allocatedSeats: { increment: 1 }, status: newAvail===0?"Assigned":"Available" } });
        if (passengerId) await tx.bookingPassenger.update({ where: { id: passengerId }, data: { ticketStatus: "Allocated", seatNumber: seatNumber||null, pnrNumber: pnrNumber||ticket.pnrNumber||null } });
        return a;
      });
      return NextResponse.json({ data: alloc, success: true }, { status: 201 });
    }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}