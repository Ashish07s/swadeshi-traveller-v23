import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalBookings, activeBookings, completed, cancelled, totalCustomers, paidFull, partial, unpaid, monthRevAgg, totalRevAgg, collectedAgg, outstandingAgg, openIssues, pendingRefunds, pendingPayments, upcomingTrips, recentBookings] = await Promise.all([
      prisma.booking.count(), prisma.booking.count({ where: { status: "Active" } }), prisma.booking.count({ where: { status: "Completed" } }), prisma.booking.count({ where: { status: "Cancelled" } }),
      prisma.customer.count(), prisma.booking.count({ where: { paymentStatus: "PAID" } }), prisma.booking.count({ where: { paymentStatus: "PARTIAL" } }), prisma.booking.count({ where: { paymentStatus: "UNPAID" } }),
      prisma.booking.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { finalPackageCost: true } }),
      prisma.booking.aggregate({ _sum: { finalPackageCost: true } }), prisma.booking.aggregate({ _sum: { totalPaid: true } }), prisma.booking.aggregate({ _sum: { balanceDue: true } }),
      prisma.customerIssue.count({ where: { status: { in: ["Open","InProgress"] } } }), prisma.refund.count({ where: { status: { in: ["Requested","Approved"] } } }), prisma.payment.count({ where: { approvalStatus: { in: ["Pending","Submitted"] } } }),
      prisma.booking.findMany({ where: { journeyDate: { gte: now }, status: { not: "Cancelled" } }, orderBy: { journeyDate: "asc" }, take: 6, select: { id: true, bookingCode: true, customerName: true, tripName: true, journeyDate: true, paxCount: true, paymentStatus: true, balanceDue: true } }),
      prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, bookingCode: true, customerName: true, tripName: true, finalPackageCost: true, paymentStatus: true, status: true, createdAt: true } }),
    ]);
    return NextResponse.json({ data: { kpis: { totalBookings, activeBookings, completed, cancelled, totalCustomers, paidFull, partial, unpaid, monthRevenue: monthRevAgg._sum.finalPackageCost??0, totalRevenue: totalRevAgg._sum.finalPackageCost??0, totalCollected: collectedAgg._sum.totalPaid??0, outstanding: outstandingAgg._sum.balanceDue??0, openIssues, pendingRefunds, pendingPayments }, upcomingTrips, recentBookings }, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}