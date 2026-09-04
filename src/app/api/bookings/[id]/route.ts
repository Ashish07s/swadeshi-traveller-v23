import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true, user: { select: { id: true, name: true, email: true, role: true } },
        passengers: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
        ticketAllocations: { include: { ticket: true, passenger: true } },
        issues: { orderBy: { createdAt: "desc" } },
        refunds: { orderBy: { createdAt: "desc" } },
        feedback: true, calendarEvents: true,
        auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: booking, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.action === "approve-discount") {
      if (!["admin","finance","founder"].includes(session.user.role)) return NextResponse.json({ error: "Only Finance/Admin can approve discounts" }, { status: 403 });
      const b = await prisma.booking.update({ where: { id }, data: { discountApprovalStatus: "Approved", discountApprovedBy: session.user.name } });
      await prisma.auditLog.create({ data: { userId: session.user.id, userName: session.user.name, action: "APPROVE", entity: "Discount", entityId: id, bookingId: id, module: "Finance" } });
      return NextResponse.json({ data: b, success: true });
    }
    if (body.action === "cancel") {
      if (!body.reason) return NextResponse.json({ error: "Cancellation reason is mandatory" }, { status: 400 });
      const b = await prisma.booking.update({ where: { id }, data: { status: "Cancelled", cancelReason: body.reason } });
      await prisma.auditLog.create({ data: { userId: session.user.id, userName: session.user.name, action: "CANCEL", entity: "Booking", entityId: id, bookingId: id, module: "Sales", reason: body.reason } });
      return NextResponse.json({ data: b, success: true });
    }
    if (body.action === "transfer") {
      const b = await prisma.booking.update({ where: { id }, data: { tripName: body.newTripName, journeyDate: new Date(body.newJourneyDate), transferredFrom: existing.tripName, originalTrip: existing.tripName } });
      await prisma.auditLog.create({ data: { userId: session.user.id, userName: session.user.name, action: "UPDATE", entity: "Booking", entityId: id, bookingId: id, module: "Sales", reason: `Transferred from ${existing.tripName} to ${body.newTripName}` } });
      return NextResponse.json({ data: b, success: true });
    }

    const { action, ...safeData } = body;
    void action;
    const b = await prisma.booking.update({ where: { id }, data: { ...safeData, updatedAt: new Date() } as never });
    return NextResponse.json({ data: b, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}