import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { formatCurrency, formatDate, PAYMENT_STATUS_COLOR, cn } from "@/lib/utils";
import { Card, StatCard, SectionHeader } from "@/components/shared";
import { ClipboardList, IndianRupee, Users, CheckCircle2, AlertCircle, Clock, TrendingUp, XCircle } from "lucide-react";

async function getData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    totalBookings, activeBookings, completed, cancelled,
    totalCustomers, paidFull, partial, unpaid,
    monthRevAgg, totalRevAgg, collectedAgg, outstandingAgg,
    openIssues, pendingRefunds, pendingPayments,
    upcomingTrips, recentBookings,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "Active" } }),
    prisma.booking.count({ where: { status: "Completed" } }),
    prisma.booking.count({ where: { status: "Cancelled" } }),
    prisma.customer.count(),
    prisma.booking.count({ where: { paymentStatus: "PAID" } }),
    prisma.booking.count({ where: { paymentStatus: "PARTIAL" } }),
    prisma.booking.count({ where: { paymentStatus: "UNPAID" } }),
    prisma.booking.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { finalPackageCost: true } }),
    prisma.booking.aggregate({ _sum: { finalPackageCost: true } }),
    prisma.booking.aggregate({ _sum: { totalPaid: true } }),
    prisma.booking.aggregate({ _sum: { balanceDue: true } }),
    prisma.customerIssue.count({ where: { status: { in: ["Open", "InProgress"] } } }),
    prisma.refund.count({ where: { status: { in: ["Requested", "Approved"] } } }),
    prisma.payment.count({ where: { approvalStatus: { in: ["Pending", "Submitted"] } } }),
    prisma.booking.findMany({
      where: { journeyDate: { gte: now }, status: { not: "Cancelled" } },
      orderBy: { journeyDate: "asc" }, take: 6,
      select: { id: true, bookingCode: true, customerName: true, tripName: true, journeyDate: true, paxCount: true, paymentStatus: true, balanceDue: true },
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" }, take: 8,
      select: { id: true, bookingCode: true, customerName: true, tripName: true, finalPackageCost: true, paymentStatus: true, status: true, createdAt: true },
    }),
  ]);
  return {
    kpis: {
      totalBookings, activeBookings, completed, cancelled,
      totalCustomers, paidFull, partial, unpaid,
      monthRevenue: monthRevAgg._sum.finalPackageCost ?? 0,
      totalRevenue: totalRevAgg._sum.finalPackageCost ?? 0,
      totalCollected: collectedAgg._sum.totalPaid ?? 0,
      outstanding: outstandingAgg._sum.balanceDue ?? 0,
      openIssues, pendingRefunds, pendingPayments,
    },
    upcomingTrips, recentBookings,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const { kpis, upcomingTrips, recentBookings } = await getData();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-slate-500 mt-1">Swadeshi Traveller — all modules connected</p>
      </div>

      {/* Alerts */}
      {(kpis.openIssues > 0 || kpis.pendingRefunds > 0 || kpis.pendingPayments > 0) && (
        <div className="flex gap-3 flex-wrap">
          {kpis.pendingPayments > 0 && (
            <Link href="/finance/payments" className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
              <Clock className="w-4 h-4" /> {kpis.pendingPayments} payment{kpis.pendingPayments > 1 ? "s" : ""} awaiting Finance approval
            </Link>
          )}
          {kpis.openIssues > 0 && (
            <Link href="/operations/issues" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
              <AlertCircle className="w-4 h-4" /> {kpis.openIssues} open issue{kpis.openIssues > 1 ? "s" : ""}
            </Link>
          )}
          {kpis.pendingRefunds > 0 && (
            <Link href="/operations/refunds" className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <XCircle className="w-4 h-4" /> {kpis.pendingRefunds} pending refund{kpis.pendingRefunds > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      {/* Booking KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Bookings" value={kpis.totalBookings} icon={<ClipboardList className="w-4 h-4 text-[#0F4C81]" />} bg="bg-blue-50" />
        <StatCard label="Active" value={kpis.activeBookings} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard label="Completed" value={kpis.completed} icon={<CheckCircle2 className="w-4 h-4 text-purple-600" />} bg="bg-purple-50" color="text-purple-600" />
        <StatCard label="Total Customers" value={kpis.totalCustomers} icon={<Users className="w-4 h-4 text-teal-600" />} bg="bg-teal-50" color="text-teal-600" />
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Monthly Revenue" value={formatCurrency(kpis.monthRevenue)} icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard label="Total Revenue" value={formatCurrency(kpis.totalRevenue)} icon={<IndianRupee className="w-4 h-4 text-[#0F4C81]" />} bg="bg-blue-50" />
        <StatCard label="Collected" value={formatCurrency(kpis.totalCollected)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard label="Outstanding" value={formatCurrency(kpis.outstanding)} icon={<AlertCircle className="w-4 h-4 text-red-500" />} bg="bg-red-50" color="text-red-500" />
      </div>

      {/* Payment status */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Fully Paid", value: kpis.paidFull, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Partially Paid", value: kpis.partial, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Unpaid", value: kpis.unpaid, color: "text-red-700", bg: "bg-red-50 border-red-200" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-2xl border p-4", s.bg)}>
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Upcoming trips */}
        <div className="lg:col-span-3">
          <Card noPad>
            <div className="p-5 pb-0">
              <SectionHeader title="Upcoming Trips" subtitle={`${upcomingTrips.length} scheduled`}
                action={<Link href="/sales/bookings" className="text-xs text-[#0F4C81] hover:underline">View all →</Link>} />
            </div>
            <div className="divide-y divide-slate-50">
              {upcomingTrips.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No upcoming trips</p>
              ) : upcomingTrips.map(t => (
                <Link key={t.id} href={`/sales/bookings/${t.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">{t.tripName}</div>
                    <div className="text-xs text-slate-500">{t.customerName} · {t.paxCount} pax · {formatDate(t.journeyDate)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn("badge text-xs", PAYMENT_STATUS_COLOR[t.paymentStatus] ?? "bg-slate-100 text-slate-600")}>{t.paymentStatus}</span>
                    {t.balanceDue > 0 && <div className="text-xs text-red-500 mt-0.5">{formatCurrency(t.balanceDue)} due</div>}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent bookings */}
        <div className="lg:col-span-2">
          <Card noPad>
            <div className="p-5 pb-0">
              <SectionHeader title="Recent Bookings"
                action={<Link href="/sales/bookings" className="text-xs text-[#0F4C81] hover:underline">All →</Link>} />
            </div>
            <div className="divide-y divide-slate-50">
              {recentBookings.map(b => (
                <Link key={b.id} href={`/sales/bookings/${b.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{b.customerName}</div>
                    <div className="text-xs text-slate-400 font-mono">{b.bookingCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">{formatCurrency(b.finalPackageCost)}</div>
                    <span className={cn("badge text-[10px]", PAYMENT_STATUS_COLOR[b.paymentStatus] ?? "bg-slate-100 text-slate-600")}>{b.paymentStatus}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
