import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

// Real Trip departure instances — the single record Sales, Logistics,
// Operations and Finance all link to via tripId. This list is the
// foundation the Trip Sheet (and later Logistics/Finance trip views) reads
// from, instead of each module re-deriving "which trips exist" from loose
// tripName string matches.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const trips = await prisma.trip.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { tripCode: { contains: search, mode: "insensitive" } },
              { destination: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { departureDate: "asc" },
    include: {
      _count: { select: { bookings: true, hotelBookings: true, transportBookings: true } },
      bookings: { select: { paxCount: true, status: true } },
    },
  });

  const data = trips.map((t: { bookings: { paxCount: number; status: string }[]; _count: { bookings: number } }) => ({
    ...t,
    totalPax: t.bookings.filter((b: { status: string }) => b.status !== "Cancelled").reduce((s: number, b: { paxCount: number }) => s + b.paxCount, 0),
    bookingCount: t._count.bookings,
  }));

  return NextResponse.json({ data });
}
