import { prisma } from "@/lib/db/prisma";
import { generateTripCode } from "@/lib/utils";

function dayStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dayEnd(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

interface ResolveTripInput {
  tripMasterId?: string | null;
  name: string;
  category: string;
  natureOfTrip: string;
  destination?: string | null;
  departureLocation?: string | null;
  departureDate: Date;
  returnDate?: Date | null;
}

/**
 * Finds the existing Trip (a specific scheduled departure) for this
 * Trip Master + departure date, or creates one if this is the first
 * booking against that departure. Every Sales booking — and, going
 * forward, every Logistics/Operations/Finance record — links to this
 * one Trip row via tripId, instead of matching loosely on tripName
 * strings.
 *
 * Private/custom trips (no tripMasterId) are matched by exact name +
 * departure day instead, since there's no shared master template to
 * key off of.
 */
export async function resolveTrip(input: ResolveTripInput) {
  const start = dayStart(input.departureDate);
  const end = dayEnd(input.departureDate);

  const existing = await prisma.trip.findFirst({
    where: {
      departureDate: { gte: start, lte: end },
      status: { not: "Cancelled" },
      ...(input.tripMasterId ? { tripMasterId: input.tripMasterId } : { name: input.name, tripMasterId: null }),
    },
  });
  if (existing) return existing;

  // First booking against this departure — snapshot the Trip Master's
  // current price onto the new Trip so later Trip Master price changes
  // don't retroactively move the price for this already-created departure.
  let basePrice: number | null = null;
  if (input.tripMasterId) {
    const master = await prisma.tripMaster.findUnique({ where: { id: input.tripMasterId } });
    basePrice = master?.basePrice ?? null;
  }

  return prisma.trip.create({
    data: {
      tripCode: generateTripCode(),
      tripMasterId: input.tripMasterId || null,
      name: input.name,
      category: input.category,
      natureOfTrip: input.natureOfTrip,
      destination: input.destination || null,
      departureLocation: input.departureLocation || null,
      departureDate: input.departureDate,
      returnDate: input.returnDate || null,
      basePrice,
      status: "Active",
    },
  });
}
