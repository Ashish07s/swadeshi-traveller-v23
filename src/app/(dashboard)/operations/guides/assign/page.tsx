"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, ExternalLink } from "lucide-react";
import { PageHeader, Card } from "@/components/shared";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Guide { id: string; name: string; phone?: string|null; status: string }
interface Assignment { id: string; guideId?: string|null; status: string; guide?: Guide|null }
interface Row { id: string; bookingCode: string; customerName: string; tripName: string; groupId?: string|null; journeyDate: string; paxCount: number; assignment: Assignment | null }

const statusBadge = (s: string) => cn("badge text-xs whitespace-nowrap",
  s === "Confirmed" || s === "Completed" ? "bg-emerald-100 text-emerald-700" :
  s === "Assigned" ? "bg-amber-100 text-amber-700" :
  s === "Cancelled" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600");

export default function AssignGuidePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, g] = await Promise.all([
        fetch("/api/guide-assignments").then(r => r.json()),
        fetch("/api/guides?status=Active").then(r => r.json()),
      ]);
      setRows(a.data ?? []); setGuides(g.data ?? []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.customerName, r.tripName, r.bookingCode, r.groupId ?? ""].some(v => v.toLowerCase().includes(q));
  }), [rows, search]);

  async function assign(row: Row, guideId: string) {
    setSavingId(row.id);
    try {
      const res = await fetch("/api/guide-assignments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: row.id, guideId: guideId || null }) });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error || "Failed"); return; }
      toast.success(guideId ? "Guide assigned" : "Guide removed");
      load();
    } catch { toast.error("Failed"); }
    finally { setSavingId(null); }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Assign Guide" subtitle="Assign available guides to customers, trips and groups" breadcrumb="Operations / Assign Guide"
        action={<button onClick={load} className="btn-secondary text-xs py-2"><RefreshCw className="w-3.5 h-3.5"/> Refresh</button>}
      />
      <Card>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, trip, group, booking code..."
          className="border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20 w-full max-w-md"/>
      </Card>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><p className="font-medium">No bookings found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{["Customer","Trip","Group","Travel Date","Guide","Status","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-[#E2E8F0] whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm"><div className="font-medium text-slate-900">{r.customerName}</div><div className="text-xs text-slate-400">{r.paxCount} pax</div></td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.tripName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.groupId || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{formatDate(r.journeyDate)}</td>
                    <td className="px-4 py-3">
                      <select disabled={savingId === r.id} value={r.assignment?.guideId || ""} onChange={e => assign(r, e.target.value)}
                        className="text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0F4C81]/20 bg-white max-w-[180px]">
                        <option value="">Not Assigned ▾</option>
                        {guides.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><span className={statusBadge(r.assignment?.status || "Pending")}>{r.assignment?.status || "Pending"}</span></td>
                    <td className="px-4 py-3"><Link href={`/sales/bookings/${r.id}`} className="text-xs text-[#0F4C81] hover:underline font-medium inline-flex items-center gap-1">View <ExternalLink className="w-3 h-3"/></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">Only Active guides appear here. Manage the roster at <Link href="/operations/guides" className="text-[#0F4C81] hover:underline">Operations → Guide Master</Link>.</p>
    </div>
  );
}
