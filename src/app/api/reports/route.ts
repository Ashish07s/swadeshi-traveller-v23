import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "6months";
    const monthsMap: Record<string,number> = { "1month":1,"3months":3,"6months":6,"1year":12 };
    const months = monthsMap[range] ?? 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth()-(months-1), 1);
    const monthlyRevenue = await Promise.all(Array.from({ length: months }, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-(months-1-i), 1);
      const end = new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59);
      return prisma.booking.aggregate({ where: { createdAt: { gte: d, lte: end } }, _sum: { finalPackageCost: true, totalPaid: true }, _count: { id: true } })
        .then(agg => ({ label: d.toLocaleString("en-IN",{month:"short",year:"2-digit"}), revenue: agg._sum.finalPackageCost??0, collected: agg._sum.totalPaid??0, bookings: agg._count.id }));
    }));
    const [statusGroups, sourceGroups, topDest, recentBookings, kpiAgg, completed, cancelled] = await Promise.all([
      prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.booking.groupBy({ by: ["leadOrigin"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      prisma.booking.groupBy({ by: ["tripName"], _count: { id: true }, _sum: { finalPackageCost: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
      prisma.booking.findMany({ where: { createdAt: { gte: startDate } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, bookingCode: true, customerName: true, tripName: true, finalPackageCost: true, totalPaid: true, balanceDue: true, status: true, createdAt: true, salesPersonName: true, journeyDate: true } }),
      prisma.booking.aggregate({ where: { createdAt: { gte: startDate } }, _sum: { finalPackageCost: true, totalPaid: true, balanceDue: true }, _count: { id: true } }),
      prisma.booking.count({ where: { createdAt: { gte: startDate }, status: "Completed" } }),
      prisma.booking.count({ where: { createdAt: { gte: startDate }, status: "Cancelled" } }),
    ]);
    return NextResponse.json({ data: { monthlyRevenue, statusBreakdown: statusGroups.map(s=>({status:s.status,count:s._count.id})), leadSourceBreakdown: sourceGroups.map(s=>({source:s.leadOrigin,count:s._count.id})), topDestinations: topDest, recentBookings, kpis: { totalRevenue: kpiAgg._sum.finalPackageCost??0, totalCollected: kpiAgg._sum.totalPaid??0, totalOutstanding: kpiAgg._sum.balanceDue??0, totalBookings: kpiAgg._count.id, completedTrips: completed, cancelledTrips: cancelled } }, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}