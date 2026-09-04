"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Download } from "lucide-react";
import { PageHeader, Card, StatCard } from "@/components/shared";
import { formatCurrency, formatDate, cn, PAYMENT_STATUS_COLOR, BOOKING_STATUS_COLOR } from "@/lib/utils";
import { toast } from "sonner";

interface Booking {
  id: string; bookingCode: string; customerName: string; phoneNumber: string;
  tripName: string; tripType: string; journeyDate: string; paxCount: number;
  finalPackageCost: number; advancePaid: number; balanceDue: number;
  paymentStatus: string; status: string; createdAt: string; salesPersonName?: string;
  customer?: { customerId: string };
}

const STATUS_TABS = ["All", "Active", "Confirmed", "Completed", "Cancelled"];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchBookings(); }, [tab]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "All") params.set("status", tab);
      if (search) params.set("search", search);
      const res = await fetch(`/api/bookings?${params}`);
      const json = await res.json();
      setBookings(json.data ?? []);
    } catch { toast.error("Failed to load bookings"); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const rows = [
      ["Booking Code","Customer","Phone","Trip","Journey Date","Pax","Package","Advance","Balance","Payment Status","Status"],
      ...bookings.map((b) => [b.bookingCode, b.customerName, b.phoneNumber, b.tripName, formatDate(b.journeyDate), b.paxCount, b.finalPackageCost, b.advancePaid, b.balanceDue, b.paymentStatus, b.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    toast.success("Exported!");
  }

  const filtered = search ? bookings.filter((b) => b.customerName.toLowerCase().includes(search.toLowerCase()) || b.bookingCode.toLowerCase().includes(search.toLowerCase()) || b.phoneNumber.includes(search) || b.tripName.toLowerCase().includes(search.toLowerCase())) : bookings;
  const totalRev = filtered.reduce((s, b) => s + b.finalPackageCost, 0);
  const totalBal = filtered.reduce((s, b) => s + b.balanceDue, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="All Bookings" subtitle={`${filtered.length} bookings`} breadcrumb="Sales"
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-secondary text-xs py-2"><Download className="w-3.5 h-3.5"/> Export</button>
            <Link href="/sales/bookings/new" className="btn-primary"><Plus className="w-4 h-4"/> New Booking</Link>
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <div className="card-p"><div className="text-xs text-slate-400">Total Revenue</div><div className="text-xl font-display font-bold text-[#0F4C81]">{formatCurrency(totalRev)}</div></div>
        <div className="card-p"><div className="text-xs text-slate-400">Total Outstanding</div><div className="text-xl font-display font-bold text-red-500">{formatCurrency(totalBal)}</div></div>
        <div className="card-p"><div className="text-xs text-slate-400">Bookings Shown</div><div className="text-xl font-display font-bold text-slate-900">{filtered.length}</div></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-[#E2E8F0]">
          {STATUS_TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-all", t === tab ? "border-[#0F4C81] text-[#0F4C81]" : "border-transparent text-slate-500 hover:text-slate-700")}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchBookings()}
            className="text-sm outline-none bg-transparent flex-1 placeholder:text-slate-400" placeholder="Search name, code, phone, trip..."/>
        </div>
        <button onClick={fetchBookings} className="btn-secondary text-xs py-2"><Filter className="w-3.5 h-3.5"/> Search</button>
      </div>
      <Card noPad>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><p className="font-medium">No bookings found</p><Link href="/sales/bookings/new" className="text-[#0F4C81] text-sm mt-2 inline-block">Create first booking →</Link></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{["Code","Customer","Trip","Journey","Pax","Package","Advance","Balance","Payment","Status",""].map((h) => <th key={h} className="th whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                    <td className="td"><span className="font-mono text-xs font-bold text-[#0F4C81]">{b.bookingCode}</span></td>
                    <td className="td"><div className="font-medium text-sm text-slate-900">{b.customerName}</div><div className="text-xs text-slate-400">{b.phoneNumber}</div></td>
                    <td className="td"><div className="text-sm text-slate-700 max-w-[140px] truncate">{b.tripName}</div><div className="text-xs text-slate-400">{b.tripType}</div></td>
                    <td className="td text-sm whitespace-nowrap">{formatDate(b.journeyDate)}</td>
                    <td className="td text-sm font-bold text-[#0F4C81]">{b.paxCount}</td>
                    <td className="td font-semibold text-sm">{formatCurrency(b.finalPackageCost)}</td>
                    <td className="td text-emerald-600 font-medium text-sm">{formatCurrency(b.advancePaid)}</td>
                    <td className="td"><span className={cn("text-sm font-bold", b.balanceDue > 0 ? "text-red-500" : "text-emerald-600")}>{b.balanceDue > 0 ? formatCurrency(b.balanceDue) : "—"}</span></td>
                    <td className="td"><span className={cn("badge text-xs", PAYMENT_STATUS_COLOR[b.paymentStatus])}>{b.paymentStatus}</span></td>
                    <td className="td"><span className={cn("badge text-xs", BOOKING_STATUS_COLOR[b.status])}>{b.status}</span></td>
                    <td className="td"><Link href={`/sales/bookings/${b.id}`} className="text-xs text-[#0F4C81] hover:underline font-medium">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}