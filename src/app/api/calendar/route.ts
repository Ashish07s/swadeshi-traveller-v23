import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    let where = {};
    if (month) {
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where = { date: { gte: start, lt: end } };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        booking: {
          select: {
            id: true, bookingCode: true, customerName: true, phoneNumber: true,
            tripName: true, tripId: true, paxCount: true, status: true, createdAt: true,
            journeyDate: true, returnDate: true, natureOfTrip: true,
            roomType: true, accommodationType: true, onwardTicketType: true, onwardClass: true,
            finalPackageCost: true, advancePaid: true, totalPaid: true, balanceDue: true,
            passengers: { select: { id: true, name: true, age: true, gender: true, phone: true } },
          },
        },
      },
    });

    // Bookings for the same Trip departure currently each get their own
    // "DEPARTURE" CalendarEvent (created 1:1 with the booking in the
    // bookings API). The Calendar should represent the Trip Departure, not
    // the individual booking, so we group those rows here at read time —
    // nothing in the underlying data is merged, deleted, or duplicated.
    //
    // Grouping key preference: booking.tripId (the real Trip row every new
    // booking is linked to via resolveTrip()) — falling back to the old
    // tripName+date string match only for any legacy events created before
    // the Trip model existed and haven't been through the backfill script.
    type DepartureBooking = {
      id: string; bookingCode: string; customerName: string; phoneNumber: string;
      paxCount: number; status: string; createdAt: Date;
      journeyDate: Date; returnDate: Date | null; natureOfTrip: string;
      roomType: string | null; accommodationType: string | null;
      onwardTicketType: string | null; onwardClass: string | null;
      finalPackageCost: number; advancePaid: number; totalPaid: number; balanceDue: number;
      passengers: { id: string; name: string; age: number | null; gender: string | null; phone: string | null }[];
    };

    const departureGroups = new Map<
      string,
      { tripName: string; date: Date; department: string | null; bookings: DepartureBooking[] }
    >();
    const passthrough: Record<string, unknown>[] = [];

    for (const e of events) {
      if (e.eventType === "DEPARTURE" && e.booking) {
        const dayKey = new Date(e.date).toISOString().slice(0, 10);
        const groupKey = e.booking.tripId ? `trip:${e.booking.tripId}` : `name:${e.booking.tripName}||${dayKey}`;
        let group = departureGroups.get(groupKey);
        if (!group) {
          group = { tripName: e.booking.tripName, date: e.date, department: e.department, bookings: [] };
          departureGroups.set(groupKey, group);
        }
        group.bookings.push({
          id: e.booking.id, bookingCode: e.booking.bookingCode, customerName: e.booking.customerName,
          phoneNumber: e.booking.phoneNumber, paxCount: e.booking.paxCount, status: e.booking.status,
          createdAt: e.booking.createdAt, journeyDate: e.booking.journeyDate, returnDate: e.booking.returnDate,
          natureOfTrip: e.booking.natureOfTrip, roomType: e.booking.roomType, accommodationType: e.booking.accommodationType,
          onwardTicketType: e.booking.onwardTicketType, onwardClass: e.booking.onwardClass,
          finalPackageCost: e.booking.finalPackageCost, advancePaid: e.booking.advancePaid,
          totalPaid: e.booking.totalPaid, balanceDue: e.booking.balanceDue, passengers: e.booking.passengers,
        });
      } else {
        passthrough.push(e);
      }
    }

    // HotelBooking/TransportBooking link back to a booking via a plain
    // `bookingId` string field (no Prisma relation defined on those models),
    // so we look them up separately rather than inventing a relation.
    const allBookingIds = Array.from(departureGroups.values()).flatMap((g) => g.bookings.map((b) => b.id));
    const [hotelBookings, transportBookings] = allBookingIds.length
      ? await Promise.all([
          prisma.hotelBooking.findMany({
            where: { bookingId: { in: allBookingIds } },
            select: { id: true, bookingId: true, hotelName: true, city: true, checkIn: true, checkOut: true, roomType: true, status: true, vendor: { select: { name: true } } },
          }),
          prisma.transportBooking.findMany({
            where: { bookingId: { in: allBookingIds } },
            select: { id: true, bookingId: true, vehicleType: true, vehicleNumber: true, driverName: true, pickupDate: true, status: true, vendor: { select: { name: true } } },
          }),
        ])
      : [[], []];

    const departures = Array.from(departureGroups.entries()).map(([groupKey, group]) => {
      // Earliest-created booking in the departure is treated as the primary
      // / main-group booker, matching how these group departures are sold in
      // practice (the first booking anchors the departure, later bookings are
      // additional PAX/groups joining the same trip).
      const bookings = [...group.bookings].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const bookingIds = new Set(bookings.map((b) => b.id));
      const totalPax = bookings.reduce((sum, b) => sum + b.paxCount, 0);
      const anyActive = bookings.some((b) => b.status !== "Cancelled");
      return {
        id: `dep_${Buffer.from(groupKey).toString("base64url")}`,
        kind: "departure" as const,
        eventType: "DEPARTURE",
        title: group.tripName,
        tripName: group.tripName,
        date: group.date,
        department: group.department,
        status: anyActive ? "Active" : "Cancelled",
        totalPax,
        bookingCount: bookings.length,
        primaryBookingId: bookings[0]?.id ?? null,
        bookings,
        totals: {
          tripCost: bookings.reduce((s, b) => s + b.finalPackageCost, 0),
          advance: bookings.reduce((s, b) => s + b.advancePaid, 0),
          payment: bookings.reduce((s, b) => s + b.totalPaid, 0),
          balance: bookings.reduce((s, b) => s + b.balanceDue, 0),
        },
        hotelBookings: hotelBookings.filter((h: { bookingId: string | null }) => h.bookingId && bookingIds.has(h.bookingId)),
        transportBookings: transportBookings.filter((t: { bookingId: string | null }) => t.bookingId && bookingIds.has(t.bookingId)),
      };
    });

    const data = [
      ...departures,
      ...passthrough.map((e) => ({ ...e, kind: "event" as const })),
    ].sort((a, b) => new Date((a as { date: Date }).date).getTime() - new Date((b as { date: Date }).date).getTime());

    return NextResponse.json({ data, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const event = await prisma.calendarEvent.create({ data: { bookingId: body.bookingId||null, tripId: body.tripId||null, tripName: body.tripName||null, eventType: body.eventType||"DEPARTURE", title: body.title, description: body.description||null, date: new Date(body.date), customerName: body.customerName||null, destination: body.destination||null, department: body.department||null, notes: body.notes||null, status: "Active" } });
    return NextResponse.json({ data: event, success: true }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
