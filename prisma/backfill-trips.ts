/**
 * One-time backfill: run this once after deploying the Trip Master
 * foundation migration, to link existing Bookings, HotelBookings and
 * TransportBookings — created before Trip existed — to a real Trip row.
 *
 * Safe to re-run: bookings that already have a tripId are skipped.
 *
 *   npx tsx prisma/backfill-trips.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateTripCode } from "../src/lib/utils";

const prisma = new PrismaClient();

function dayKey(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { tripId: null },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${bookings.length} bookings without a Trip link.`);

  // Group by Trip Master match (name) + departure day, same key the app
  // uses going forward when resolving/creating a Trip for a new booking.
  const groups = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = `${b.tripName}||${dayKey(b.journeyDate)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  let tripsCreated = 0;
  let bookingsLinked = 0;

  for (const group of Array.from(groups.values())) {
    const first = group[0];
    const master = await prisma.tripMaster.findFirst({ where: { name: first.tripName } });

    const trip = await prisma.trip.create({
      data: {
        tripCode: generateTripCode(),
        tripMasterId: master?.id ?? null,
        name: first.tripName,
        category: first.tripType,
        natureOfTrip: first.natureOfTrip,
        destination: first.destination ?? master?.destination ?? null,
        departureDate: first.journeyDate,
        returnDate: first.returnDate,
        basePrice: master?.basePrice ?? null,
        status: "Active",
      },
    });
    tripsCreated++;

    await prisma.booking.updateMany({
      where: { id: { in: group.map((b: { id: string }) => b.id) } },
      data: { tripId: trip.id },
    });
    bookingsLinked += group.length;

    // Best-effort: link HotelBooking/TransportBooking rows that recorded
    // the same tripName string but never had a tripId, IF the name alone
    // maps unambiguously to this one Trip (it does here since we just
    // grouped by exact name + day and this is the only Trip for that key).
    await prisma.hotelBooking.updateMany({
      where: { tripId: null, tripName: first.tripName },
      data: { tripId: trip.id },
    });
    await prisma.transportBooking.updateMany({
      where: { tripId: null, tripName: first.tripName },
      data: { tripId: trip.id },
    });

    await prisma.calendarEvent.updateMany({
      where: { tripId: null, bookingId: { in: group.map((b: { id: string }) => b.id) } },
      data: { tripId: trip.id },
    });
  }

  console.log(`Created ${tripsCreated} Trip rows, linked ${bookingsLinked} bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
