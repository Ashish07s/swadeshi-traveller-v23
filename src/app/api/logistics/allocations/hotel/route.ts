import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

// Whitelist of fields Logistics may set from the allocation sheet.
// Cost, paidAmount and paymentStatus are deliberately absent — those stay
// Finance-controlled even if a client sent them in the request body.
function operationalFields(body: Record<string, unknown>) {
  return {
    hotelName: (body.hotelName as string) || "Hotel TBD",
    city: (body.city as string) || null,
    area: (body.area as string) || null,
    roomCount: body.roomCount ? Number(body.roomCount) : 1,
    guestCount: body.guestCount ? Number(body.guestCount) : 1,
    roomType: (body.roomType as string) || null,
    mealPlan: (body.mealPlan as string) || null,
    confirmationNo: (body.confirmationNo as string) || null,
    specialRequests: (body.specialRequests as string) || null,
  };
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "founder", "logistics"].includes(session.user.role)) {
      return NextResponse.json({ error: "Only Logistics/Admin can update hotel allocation" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id: body.bookingId }, select: { id: true, tripId: true, tripName: true, journeyDate: true, returnDate: true } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // "Not required" is a Logistics call on the booking itself, not on the
    // allocation record — handled here without touching HotelBooking at all.
    if (body.hotelRequired === false) {
      await prisma.booking.update({ where: { id: body.bookingId }, data: { hotelRequired: false } });
      return NextResponse.json({ data: { hotelRequired: false }, success: true });
    }
    if (body.hotelRequired === true) {
      await prisma.booking.update({ where: { id: body.bookingId }, data: { hotelRequired: true } });
    }

    let vendorName: string | null = null;
    if (body.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
      if (!vendor || !vendor.isActive) return NextResponse.json({ error: "Vendor not found or inactive" }, { status: 400 });
      if (vendor.type !== "Hotel") return NextResponse.json({ error: "Selected vendor is not a Hotel vendor" }, { status: 400 });
      vendorName = vendor.name;
    }

    const existing = await prisma.hotelBooking.findFirst({ where: { bookingId: body.bookingId } });
    const wasVendorId = existing?.vendorId ?? null;
    const checkIn = body.checkIn ? new Date(body.checkIn) : existing?.checkIn ?? booking.journeyDate;
    const checkOut = body.checkOut ? new Date(body.checkOut) : existing?.checkOut ?? booking.returnDate ?? booking.journeyDate;
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const status = body.status || (body.vendorId ? "Assigned" : existing?.status ?? "Pending");

    const data = { ...operationalFields(body), tripName: booking.tripName, tripId: booking.tripId, bookingId: body.bookingId, vendorId: body.vendorId ?? existing?.vendorId ?? null, checkIn, checkOut, nights, status };

    const record = existing
      ? await prisma.hotelBooking.update({ where: { id: existing.id }, data })
      : await prisma.hotelBooking.create({ data: { ...data, hotelName: data.hotelName } });

    if (body.vendorId && body.vendorId !== wasVendorId) {
      await prisma.auditLog.create({ data: { userId: session.user.id, userName: session.user.name, action: wasVendorId ? "HOTEL_VENDOR_CHANGED" : "HOTEL_VENDOR_ASSIGNED", entity: "HotelBooking", entityId: record.id, bookingId: body.bookingId, module: "Logistics", oldValue: wasVendorId ? { vendorId: wasVendorId } : undefined, newValue: { vendorId: body.vendorId, vendorName } } });
    }

    return NextResponse.json({ data: record, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed to update hotel allocation" }, { status: 500 }); }
}
