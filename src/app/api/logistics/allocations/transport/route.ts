import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

// Whitelist of fields Logistics may set from the allocation sheet.
// cost, paidAmount and paymentStatus are deliberately absent.
function operationalFields(body: Record<string, unknown>) {
  return {
    vehicleType: (body.vehicleType as string) || null,
    vehicleNumber: (body.vehicleNumber as string) || null,
    driverName: (body.driverName as string) || null,
    driverPhone: (body.driverPhone as string) || null,
    capacity: body.capacity ? Number(body.capacity) : null,
    pickupLocation: (body.pickupLocation as string) || null,
    dropLocation: (body.dropLocation as string) || null,
    pickupDate: body.pickupDate ? new Date(body.pickupDate as string) : null,
    pickupTime: (body.pickupTime as string) || null,
    notes: (body.notes as string) || null,
  };
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "founder", "logistics"].includes(session.user.role)) {
      return NextResponse.json({ error: "Only Logistics/Admin can update transport allocation" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id: body.bookingId }, select: { id: true, tripId: true, tripName: true } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (body.transportRequired === false) {
      await prisma.booking.update({ where: { id: body.bookingId }, data: { transportRequired: false } });
      return NextResponse.json({ data: { transportRequired: false }, success: true });
    }
    if (body.transportRequired === true) {
      await prisma.booking.update({ where: { id: body.bookingId }, data: { transportRequired: true } });
    }

    let vendorName: string | null = null;
    if (body.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
      if (!vendor || !vendor.isActive) return NextResponse.json({ error: "Vendor not found or inactive" }, { status: 400 });
      if (vendor.type !== "Transport") return NextResponse.json({ error: "Selected vendor is not a Transport vendor" }, { status: 400 });
      vendorName = vendor.name;
    }

    const existing = await prisma.transportBooking.findFirst({ where: { bookingId: body.bookingId } });
    const wasVendorId = existing?.vendorId ?? null;
    const status = body.status || (body.vendorId ? "Assigned" : existing?.status ?? "Pending");

    const data = { ...operationalFields(body), tripName: booking.tripName, tripId: booking.tripId, bookingId: body.bookingId, vendorId: body.vendorId ?? existing?.vendorId ?? null, status };

    const record = existing
      ? await prisma.transportBooking.update({ where: { id: existing.id }, data })
      : await prisma.transportBooking.create({ data: { ...data, bookedBy: session.user.name } });

    if (body.vendorId && body.vendorId !== wasVendorId) {
      await prisma.auditLog.create({ data: { userId: session.user.id, userName: session.user.name, action: wasVendorId ? "TRANSPORT_VENDOR_CHANGED" : "TRANSPORT_VENDOR_ASSIGNED", entity: "TransportBooking", entityId: record.id, bookingId: body.bookingId, module: "Logistics", oldValue: wasVendorId ? { vendorId: wasVendorId } : undefined, newValue: { vendorId: body.vendorId, vendorName } } });
    }

    return NextResponse.json({ data: record, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed to update transport allocation" }, { status: 500 }); }
}
