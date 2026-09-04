import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { generateBookingCode, generateCustomerId } from "@/lib/utils";
import { resolveTrip } from "@/lib/trip/resolve";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const bookings = await prisma.booking.findMany({
      where: {
        ...(status && status !== "All" ? { status } : {}),
        ...(search ? { OR: [{ customerName: { contains: search, mode: "insensitive" } }, { phoneNumber: { contains: search } }, { tripName: { contains: search, mode: "insensitive" } }, { bookingCode: { contains: search, mode: "insensitive" } }] } : {}),
      },
      include: { customer: { select: { customerId: true, totalBookings: true } }, passengers: true, payments: { select: { id: true, amount: true, approvalStatus: true } }, _count: { select: { passengers: true, payments: true } } },
      orderBy: { createdAt: "desc" }, take: limit,
    });
    return NextResponse.json({ data: bookings, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    if (!body.customerName || !body.phoneNumber || !body.tripName || !body.journeyDate) {
      return NextResponse.json({ error: "Name, phone, trip and journey date required" }, { status: 400 });
    }

    const paxCount = Number(body.paxCount) || 1;
    if (paxCount < 1) {
      return NextResponse.json({ error: "Pax count must be at least 1" }, { status: 400 });
    }

    // Backend is authoritative on passenger count: the number of named
    // passengers submitted must match paxCount (at minimum, passenger 1 is
    // always required). The frontend keeps these in sync automatically, but
    // we never trust the client to have done that correctly.
    const submittedPassengers: { name: string; age?: number | null; gender?: string | null; phone?: string | null }[] =
      Array.isArray(body.passengers) ? body.passengers.filter((p: { name?: string }) => p?.name?.trim()) : [];
    if (submittedPassengers.length === 0) {
      return NextResponse.json({ error: "At least one passenger name is required" }, { status: 400 });
    }
    if (submittedPassengers.length !== paxCount) {
      return NextResponse.json(
        { error: `Passenger count (${submittedPassengers.length}) must match Number of People (${paxCount})` },
        { status: 400 }
      );
    }

    // Reject negative monetary inputs outright rather than silently clamping —
    // clamping can hide a data-entry mistake (e.g. a stray minus sign).
    const numericFields: [string, unknown][] = [
      ["basePackageCost", body.basePackageCost], ["onwardDifference", body.onwardDifference],
      ["returnDifference", body.returnDifference], ["discountAmount", body.discountAmount],
      ["additionalCharges", body.additionalCharges], ["advancePaid", body.advancePaid],
      ["ticketAdvanceAmount", body.ticketAdvanceAmount], ["actualTicketCost", body.actualTicketCost],
    ];
    for (const [label, value] of numericFields) {
      if (value !== undefined && value !== null && value !== "" && Number(value) < 0) {
        return NextResponse.json({ error: `${label} cannot be negative` }, { status: 400 });
      }
    }

    // Find existing customer by phone, or create a new one
    let customer = await prisma.customer.findFirst({ where: { phone: body.phoneNumber } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          customerId: generateCustomerId(),
          name: body.customerName,
          phone: body.phoneNumber,
          whatsapp: body.whatsapp || body.phoneNumber,
          email: body.email || null,
          city: body.city || null,
        },
      });
    }

    // Resolve (or create) the real Trip departure this booking belongs to.
    // Every booking against the same Trip Master + departure date shares one
    // Trip row, which Calendar, Logistics, Operations and Finance all link to
    // via tripId instead of matching loosely on tripName strings.
    const trip = await resolveTrip({
      tripMasterId: body.tripMasterId || null,
      name: body.tripName,
      category: body.tripType || "Weekend",
      natureOfTrip: body.natureOfTrip || "GroupDeparture",
      destination: body.destination || null,
      departureDate: new Date(body.journeyDate),
      returnDate: body.returnDate ? new Date(body.returnDate) : null,
    });

    // Trip Master pricing is the single source of truth: unless sales
    // explicitly overrode the price on this booking, the per-pax price is
    // locked to this Trip's snapshotted base price rather than whatever the
    // client happened to send. If Trip Master's price changes later, this
    // booking's already-created Trip (and price) doesn't move.
    const basePackageCost = !body.baseCostManual && trip.basePrice != null
      ? trip.basePrice * paxCount
      : Number(body.basePackageCost) || 0;
    const onwardDifference = Number(body.onwardDifference) || 0;
    const returnDifference = Number(body.returnDifference) || 0;
    const discountAmount = Number(body.discountAmount) || 0;
    const additionalCharges = Number(body.additionalCharges) || 0;
    const finalPackageCost = Math.max(0, basePackageCost + onwardDifference + returnDifference - discountAmount + additionalCharges);
    const advancePaid = Number(body.advancePaid) || 0;
    const totalPaid = advancePaid;
    const balanceDue = Math.max(0, finalPackageCost - totalPaid);
    const paymentStatus = totalPaid <= 0 ? "UNPAID" : balanceDue > 0 ? "PARTIAL" : "PAID";

    const booking = await prisma.booking.create({
      data: {
        bookingCode: generateBookingCode(), customerId: customer.id, userId: session.user.id,
        customerName: body.customerName, phoneNumber: body.phoneNumber, whatsapp: body.whatsapp || body.phoneNumber,
        city: body.city || null, tripType: body.tripType || "Weekend", tripName: body.tripName,
        natureOfTrip: body.natureOfTrip || "GroupDeparture", destination: body.destination || null,
        tripId: trip.id,
        journeyDate: new Date(body.journeyDate), returnDate: body.returnDate ? new Date(body.returnDate) : null,
        duration: body.duration ? Number(body.duration) : null,
        paxCount, roomType: body.roomType || null, accommodationType: body.accommodationType || null,
        onwardTicketType: body.onwardTicketType || null, onwardClass: body.onwardClass || null, onwardFrom: body.onwardFrom || null,
        returnTicketType: body.returnTicketType || null, returnClass: body.returnClass || null, returnTo: body.returnTo || null,
        basePackageCost, onwardDifference, onwardDiffDesc: body.onwardDiffDesc || null, onwardDiffRequired: !!body.onwardDiffRequired,
        returnDifference, returnDiffDesc: body.returnDiffDesc || null, returnDiffRequired: !!body.returnDiffRequired,
        discountType: body.discountType || null, discountValue: Number(body.discountValue) || 0,
        discountAmount, discountReason: body.discountReason || null,
        discountApprovalStatus: discountAmount > 0 ? "Pending" : "Approved",
        additionalCharges, additionalChargesDesc: body.additionalChargesDesc || null,
        finalPackageCost,
        ticketAdvanceAmount: Number(body.ticketAdvanceAmount) || 0, actualTicketCost: Number(body.actualTicketCost) || 0,
        ticketAdvanceBalance: (Number(body.ticketAdvanceAmount) || 0) - (Number(body.actualTicketCost) || 0),
        advancePaid, totalPaid, balanceDue, paymentStatus,
        gstType: body.gstType || "NonGST", leadOrigin: body.leadOrigin || "WhatsApp",
        salesPersonName: body.salesPersonName || session.user.name, notes: body.notes || null, status: "Active",
        passengers: {
          create: submittedPassengers.map((p) => ({
            name: p.name, age: p.age ?? null, gender: p.gender ?? null, phone: p.phone ?? null,
          })),
        },
      },
    });

    // Create a matching pending payment record for Finance to approve, if an advance was entered.
    // Sales enters this; Sales can never approve it (enforced in /api/payments/[id]).
    if (advancePaid > 0) {
      const paymentCode = `PAY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, "0")}`;
      await prisma.payment.create({
        data: {
          paymentCode, bookingId: booking.id, amount: advancePaid,
          paymentMethod: body.paymentMethod || "UPI", utrNumber: body.utrNumber || null,
          enteredBy: session.user.name, enteredByRole: session.user.role,
          approvalStatus: "Submitted", submittedAt: new Date(),
          notes: body.notes || null,
        },
      });
    }

    await prisma.customer.update({ where: { id: customer.id }, data: { totalBookings: { increment: 1 } } });

    // Auto-create calendar events, linked to both the booking and the resolved Trip
    await prisma.calendarEvent.create({ data: { bookingId: booking.id, tripId: trip.id, tripName: booking.tripName, eventType: "DEPARTURE", title: `${booking.tripName} — ${booking.customerName}`, date: new Date(body.journeyDate), customerName: booking.customerName, destination: booking.destination || booking.tripName, department: "Operations", status: "Active" } });
    if (balanceDue > 0) {
      const balDate = new Date(body.journeyDate); balDate.setDate(balDate.getDate() - 7);
      await prisma.calendarEvent.create({ data: { bookingId: booking.id, tripId: trip.id, eventType: "BALANCE_DUE", title: `Balance Due ₹${balanceDue.toLocaleString("en-IN")} — ${booking.customerName}`, date: balDate, customerName: booking.customerName, department: "Finance", status: "Active" } });
    }

    await prisma.auditLog.create({ data: { userId: session.user.id, userName: session.user.name, action: "CREATE", entity: "Booking", entityId: booking.id, bookingId: booking.id, module: "Sales", newValue: { bookingCode: booking.bookingCode, customerName: booking.customerName, finalPackageCost, tripId: trip.id } } });

    return NextResponse.json({ data: booking, success: true }, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed to create booking" }, { status: 500 }); }
}
