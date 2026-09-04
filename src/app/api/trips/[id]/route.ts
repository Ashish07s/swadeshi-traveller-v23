import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

// The single detail endpoint for a Trip departure — pulls together
// everything Sales, Logistics and Finance have recorded against this one
// Trip ID. This is the data foundation the full Trip Sheet UI (tickets,
// transportation, hotels, guide, expenses, finance summary) will be built
// on top of in the next phase.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      tripMaster: true,
      bookings: {
        orderBy: { createdAt: "asc" },
        include: {
          passengers: true,
          payments: { orderBy: { createdAt: "desc" } },
          ticketAllocations: true,
        },
      },
      hotelBookings: { include: { vendor: true } },
      transportBookings: { include: { vendor: true } },
    },
  });

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const activeBookings = trip.bookings.filter((b: { status: string }) => b.status !== "Cancelled");
  const summary = {
    totalPax: activeBookings.reduce((s: number, b: { paxCount: number }) => s + b.paxCount, 0),
    bookingCount: activeBookings.length,
    revenue: activeBookings.reduce((s: number, b: { finalPackageCost: number }) => s + b.finalPackageCost, 0),
    received: activeBookings.reduce((s: number, b: { totalPaid: number }) => s + b.totalPaid, 0),
    receivable: activeBookings.reduce((s: number, b: { balanceDue: number }) => s + b.balanceDue, 0),
    hotelCost: trip.hotelBookings.reduce((s: number, h: { totalCost: number }) => s + h.totalCost, 0),
    transportCost: trip.transportBookings.reduce((s: number, t: { cost: number }) => s + t.cost, 0),
  };

  return NextResponse.json({ data: { ...trip, summary } });
}
