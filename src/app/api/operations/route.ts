import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "overview";
    if (type === "overview") {
      const [openIssues, pendingRefunds, feedbackCount, transports, hotels] = await Promise.all([
        prisma.customerIssue.count({ where: { status: { in: ["Open","InProgress"] } } }),
        prisma.refund.count({ where: { status: { in: ["Requested","Approved"] } } }),
        prisma.tripFeedback.count(), prisma.transportBooking.count(), prisma.hotelBooking.count(),
      ]);
      return NextResponse.json({ data: { openIssues, pendingRefunds, feedbackCount, transports, hotels }, success: true });
    }
    if (type === "issues") { const data = await prisma.customerIssue.findMany({ include: { booking: { select: { bookingCode: true, customerName: true } } }, orderBy: { createdAt: "desc" } }); return NextResponse.json({ data, success: true }); }
    if (type === "refunds") { const data = await prisma.refund.findMany({ include: { booking: { select: { bookingCode: true, customerName: true, phoneNumber: true } } }, orderBy: { createdAt: "desc" } }); return NextResponse.json({ data, success: true }); }
    if (type === "feedback") { const data = await prisma.tripFeedback.findMany({ include: { booking: { select: { bookingCode: true, customerName: true, tripName: true } } }, orderBy: { createdAt: "desc" } }); return NextResponse.json({ data, success: true }); }
    if (type === "transports") { const data = await prisma.transportBooking.findMany({ include: { vendor: { select: { name: true, phone: true } } }, orderBy: { createdAt: "desc" } }); return NextResponse.json({ data, success: true }); }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { type, ...data } = body;
    if (type === "issue") { const r = await prisma.customerIssue.create({ data: { bookingId: data.bookingId, concern: data.concern, responsibility: data.responsibility||null, assignedTo: data.assignedTo||null, notes: data.notes||null, status: "Open" } }); return NextResponse.json({ data: r, success: true }, { status: 201 }); }
    if (type === "refund") {
      if (!data.reason) return NextResponse.json({ error: "Refund reason is mandatory" }, { status: 400 });
      const r = await prisma.refund.create({ data: { bookingId: data.bookingId, reason: data.reason, amount: Number(data.amount), paymentMethod: data.paymentMethod||null, utrNumber: data.utrNumber||null, status: "Requested", financeNotified: true, notes: data.notes||null } });
      await prisma.calendarEvent.create({ data: { bookingId: data.bookingId, eventType: "REFUND", title: `Refund ₹${data.amount} — Requested`, date: new Date(), department: "Finance", status: "Active" } });
      return NextResponse.json({ data: r, success: true }, { status: 201 });
    }
    if (type === "feedback") { const r = await prisma.tripFeedback.create({ data: { bookingId: data.bookingId, accommodationRating: data.accommodationRating?Number(data.accommodationRating):null, transportRating: data.transportRating?Number(data.transportRating):null, placesRating: data.placesRating?Number(data.placesRating):null, guideRating: data.guideRating?Number(data.guideRating):null, overallRating: data.overallRating?Number(data.overallRating):null, comments: data.comments||null } }); return NextResponse.json({ data: r, success: true }, { status: 201 }); }
    if (type === "transport") { const r = await prisma.transportBooking.create({ data: { tripName: data.tripName||null, bookingId: data.bookingId||null, vendorId: data.vendorId||null, vehicleType: data.vehicleType||null, vehicleNumber: data.vehicleNumber||null, driverName: data.driverName||null, driverPhone: data.driverPhone||null, capacity: data.capacity?Number(data.capacity):null, pickupLocation: data.pickupLocation||null, dropLocation: data.dropLocation||null, pickupDate: data.pickupDate?new Date(data.pickupDate):null, pickupTime: data.pickupTime||null, cost: Number(data.cost)||0, status: "Pending", paymentStatus: "Unpaid", bookedBy: session.user.name } }); return NextResponse.json({ data: r, success: true }, { status: 201 }); }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { type, id, ...data } = await req.json();
    if (type === "issue") { const r = await prisma.customerIssue.update({ where: { id }, data: { ...data, updatedAt: new Date() } }); return NextResponse.json({ data: r, success: true }); }
    if (type === "refund") { const r = await prisma.refund.update({ where: { id }, data: { ...data, updatedAt: new Date() } }); return NextResponse.json({ data: r, success: true }); }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}