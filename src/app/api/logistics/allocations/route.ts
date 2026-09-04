import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

// A hotel/transport row counts as "assigned" for the sheet's overall status
// once a vendor is on it and it isn't marked Cancelled — Confirmed is a
// further operational state on top of that, not a prerequisite.
const ASSIGNED_STATUSES = ["Assigned", "Confirmed"];

interface BookingRow {
  id: string; bookingCode: string; customerName: string; phoneNumber: string;
  tripName: string; tripId: string | null; groupId: string | null;
  journeyDate: Date; returnDate: Date | null; paxCount: number;
  hotelRequired: boolean; transportRequired: boolean;
}
interface HotelRow { id: string; bookingId: string | null; status: string; vendorId: string | null; [k: string]: unknown }
interface TransportRow { id: string; bookingId: string | null; status: string; vendorId: string | null; [k: string]: unknown }

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookings: BookingRow[] = await prisma.booking.findMany({
      where: { status: { not: "Cancelled" } },
      select: {
        id: true, bookingCode: true, customerName: true, phoneNumber: true,
        tripName: true, tripId: true, groupId: true, journeyDate: true, returnDate: true,
        paxCount: true, hotelRequired: true, transportRequired: true,
      },
      orderBy: { journeyDate: "asc" },
    });

    const bookingIds = bookings.map((b) => b.id);
    let hotelBookings: HotelRow[] = [];
    let transportBookings: TransportRow[] = [];
    if (bookingIds.length) {
      [hotelBookings, transportBookings] = await Promise.all([
        prisma.hotelBooking.findMany({
          where: { bookingId: { in: bookingIds } },
          select: { id: true, bookingId: true, hotelName: true, city: true, checkIn: true, checkOut: true, roomCount: true, guestCount: true, roomType: true, mealPlan: true, confirmationNo: true, status: true, vendorId: true, vendor: { select: { id: true, name: true } } },
        }),
        prisma.transportBooking.findMany({
          where: { bookingId: { in: bookingIds } },
          select: { id: true, bookingId: true, vehicleType: true, vehicleNumber: true, driverName: true, driverPhone: true, capacity: true, pickupLocation: true, dropLocation: true, pickupDate: true, pickupTime: true, notes: true, status: true, vendorId: true, vendor: { select: { id: true, name: true } } },
        }),
      ]);
    }

    const hotelByBooking = new Map(hotelBookings.map((h) => [h.bookingId, h]));
    const transportByBooking = new Map(transportBookings.map((t) => [t.bookingId, t]));

    const rows = bookings.map((b) => {
      const hotel = hotelByBooking.get(b.id) ?? null;
      const transport = transportByBooking.get(b.id) ?? null;
      const hotelOk = !b.hotelRequired || (!!hotel && ASSIGNED_STATUSES.includes(hotel.status));
      const transportOk = !b.transportRequired || (!!transport && ASSIGNED_STATUSES.includes(transport.status));
      const allocationStatus = hotelOk && transportOk ? "Fully Assigned" : (hotelOk || transportOk) && (b.hotelRequired || b.transportRequired) ? "Partially Assigned" : "Pending";
      return { ...b, hotel, transport, allocationStatus };
    });

    return NextResponse.json({ data: rows, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
