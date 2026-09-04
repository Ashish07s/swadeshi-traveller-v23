"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Hotel, Truck, RefreshCw, ExternalLink } from "lucide-react";
import { PageHeader, Card } from "@/components/shared";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Vendor { id: string; name: string; type: string; isActive: boolean }
interface HotelRow { id: string; hotelName: string; city?: string|null; checkIn: string; checkOut: string; roomType?: string|null; status: string; vendorId?: string|null; vendor?: { id: string; name: string } | null }
interface TransportRow { id: string; vehicleType?: string|null; vehicleNumber?: string|null; driverName?: string|null; status: string; vendorId?: string|null; vendor?: { id: string; name: string } | null }
interface AllocRow {
  id: string; bookingCode: string; customerName: string; phoneNumber: string;
  tripName: string; tripId?: string|null; groupId?: string|null; journeyDate: string; returnDate?: string|null;
  paxCount: number; hotelRequired: boolean; transportRequired: boolean;
  hotel: HotelRow | null; transport: TransportRow | null; allocationStatus: "Pending" | "Partially Assigned" | "Fully Assigned";
}

const statusBadge = (s: string) => cn("badge text-xs whitespace-nowrap",
  s === "Fully Assigned" || s === "Confirmed" ? "bg-emerald-100 text-emerald-700" :
  s === "Partially Assigned" || s === "Assigned" ? "bg-amber-100 text-amber-700" :
  s === "Cancelled" ? "bg-red-100 text-red-700" :
  s === "Not Required" ? "bg-slate-100 text-slate-500" : "bg-slate-100 text-slate-600");

export default function AllocateHotelTransportPage() {
  const [rows, setRows] = useState<AllocRow[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<"All"|"Pending"|"Partially Assigned"|"Fully Assigned">("All");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, v] = await Promise.all([
        fetch("/api/logistics/allocations").then(r => r.json()),
        fetch("/api/vendors").then(r => r.json()),
      ]);
      setRows(a.data ?? []);
      setVendors(v.data ?? []);
    } catch { toast.error("Failed to load allocations"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const hotelVendors = vendors.filter(v => v.type === "Hotel" && v.isActive);
  const transportVendors = vendors.filter(v => v.type === "Transport" && v.isActive);

  const filtered = useMemo(() => rows.filter(r => {
    if (quickFilter !== "All" && r.allocationStatus !== quickFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![r.customerName, r.tripName, r.bookingCode, r.groupId ?? ""].some(v => v.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [rows, quickFilter, search]);

  async function assignVendor(row: AllocRow, kind: "hotel" | "transport", vendorId: string) {
    const key = `${row.id}-${kind}`;
    setSavingKey(key);
    try {
      const res = await fetch(`/api/logistics/allocations/${kind}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: row.id, vendorId: vendorId || null, hotelName: kind === "hotel" ? row.hotel?.hotelName || row.tripName : undefined, checkIn: row.journeyDate, checkOut: row.returnDate || row.journeyDate }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      toast.success(vendorId ? "Vendor assigned" : "Vendor removed");
      load();
    } catch { toast.error("Failed to assign vendor"); }
    finally { setSavingKey(null); }
  }

  async function toggleRequired(row: AllocRow, kind: "hotel" | "transport", required: boolean) {
    const key = `${row.id}-${kind}-req`;
    setSavingKey(key);
    try {
      await fetch(`/api/logistics/allocations/${kind}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: row.id, [kind === "hotel" ? "hotelRequired" : "transportRequired"]: required }),
      });
      toast.success(required ? "Marked as required" : "Marked as not required");
      load();
    } catch { toast.error("Failed"); }
    finally { setSavingKey(null); }
  }

  const selectCls = "text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0F4C81]/20 bg-white max-w-[160px]";

  return (
    <div className="space-y-5">
      <PageHeader title="Allocate Hotel & Transport" subtitle="Assign hotels and transportation to customers, trips and groups" breadcrumb="Logistics"
        action={<button onClick={load} className="btn-secondary text-xs py-2"><RefreshCw className="w-3.5 h-3.5"/> Refresh</button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, trip, group, booking code..."
            className="border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20 flex-1 min-w-[220px]"/>
          <div className="flex gap-1.5">
            {(["All","Pending","Partially Assigned","Fully Assigned"] as const).map(f => (
              <button key={f} onClick={() => setQuickFilter(f)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border", quickFilter === f ? "bg-[#0F4C81] text-white border-[#0F4C81]" : "border-[#E2E8F0] text-slate-600 hover:bg-slate-50")}>
                {f}
              </button>
            ))}
          </div>
          {(search || quickFilter !== "All") && (
            <button onClick={() => { setSearch(""); setQuickFilter("All"); }} className="text-xs text-slate-400 hover:text-slate-600 underline">Reset Filters</button>
          )}
        </div>
      </Card>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><p className="font-medium">No bookings match these filters</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  {["Customer","Trip","Group","Travel Date","Hotel","Transport","Status","Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-[#E2E8F0] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-slate-900">{r.customerName}</div>
                      <div className="text-xs text-slate-400">{r.phoneNumber} · {r.paxCount} pax</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.tripName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.groupId || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{formatDate(r.journeyDate)}</td>

                    {/* Hotel cell */}
                    <td className="px-4 py-3">
                      {!r.hotelRequired ? (
                        <div className="flex items-center gap-2">
                          <span className={statusBadge("Not Required")}>Not Required</span>
                          <button onClick={() => toggleRequired(r, "hotel", true)} className="text-[10px] text-[#0F4C81] hover:underline">Mark required</button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Hotel className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                            <select disabled={savingKey === `${r.id}-hotel`} value={r.hotel?.vendorId || ""} onChange={e => assignVendor(r, "hotel", e.target.value)} className={selectCls}>
                              <option value="">Not Assigned ▾</option>
                              {hotelVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          </div>
                          {r.hotel && <span className={statusBadge(r.hotel.status)}>{r.hotel.status}</span>}
                          <button onClick={() => toggleRequired(r, "hotel", false)} className="block text-[10px] text-slate-400 hover:text-slate-600 underline">Not required</button>
                        </div>
                      )}
                    </td>

                    {/* Transport cell */}
                    <td className="px-4 py-3">
                      {!r.transportRequired ? (
                        <div className="flex items-center gap-2">
                          <span className={statusBadge("Not Required")}>Not Required</span>
                          <button onClick={() => toggleRequired(r, "transport", true)} className="text-[10px] text-[#0F4C81] hover:underline">Mark required</button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                            <select disabled={savingKey === `${r.id}-transport`} value={r.transport?.vendorId || ""} onChange={e => assignVendor(r, "transport", e.target.value)} className={selectCls}>
                              <option value="">Not Assigned ▾</option>
                              {transportVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          </div>
                          {r.transport && <span className={statusBadge(r.transport.status)}>{r.transport.status}</span>}
                          <button onClick={() => toggleRequired(r, "transport", false)} className="block text-[10px] text-slate-400 hover:text-slate-600 underline">Not required</button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3"><span className={statusBadge(r.allocationStatus)}>{r.allocationStatus}</span></td>
                    <td className="px-4 py-3">
                      <Link href={`/sales/bookings/${r.id}`} className="text-xs text-[#0F4C81] hover:underline font-medium inline-flex items-center gap-1">
                        View <ExternalLink className="w-3 h-3"/>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">Vendors are managed by Finance. To add or edit a vendor, go to <Link href="/finance/vendors" className="text-[#0F4C81] hover:underline">Finance → Vendors</Link>.</p>
    </div>
  );
}
