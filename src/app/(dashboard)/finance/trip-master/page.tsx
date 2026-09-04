"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Card, Modal, SectionHeader } from "@/components/shared";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface TripMasterRow {
  id: string; name: string; destination: string; category: string;
  basePrice?: number | null; defaultDays?: number | null; isActive: boolean;
}

const CATEGORIES = ["Weekend", "Backpacking", "Temple", "Custom"];
const emptyForm = { id: "", name: "", destination: "", category: "Weekend", basePrice: "", defaultDays: "" };

export default function TripMasterPage() {
  const [trips, setTrips] = useState<TripMasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function fetchTrips() {
    setLoading(true);
    try {
      const res = await fetch("/api/trip-master?all=1");
      const json = await res.json();
      setTrips(json.data ?? []);
    } catch { toast.error("Failed to load trip master"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchTrips(); }, []);

  function openNew() { setForm(emptyForm); setModal(true); }
  function openEdit(t: TripMasterRow) {
    setForm({ id: t.id, name: t.name, destination: t.destination, category: t.category, basePrice: t.basePrice?.toString() ?? "", defaultDays: t.defaultDays?.toString() ?? "" });
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.destination) { toast.error("Trip name and destination are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/trip-master", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: form.id || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(form.id ? "Trip updated" : "Trip added");
      setModal(false); fetchTrips();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  const byCategory = CATEGORIES.map((c) => ({ category: c, items: trips.filter((t) => t.category === c) }));

  return (
    <div className="space-y-5">
      <PageHeader title="Trip Master & Pricing" subtitle="Per-person base price used to auto-calculate booking cost (pax count × base price)" breadcrumb="Finance / Trip Master"
        action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4"/> Add Trip</button>}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
        When creating a booking, selecting one of these trips auto-fills the package cost as <strong>number of people × base price</strong>. Sales can still override the amount for special cases.
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>
      ) : (
        <div className="space-y-4">
          {byCategory.map(({ category, items }) => (
            <Card key={category} noPad>
              <div className="p-5 pb-0"><SectionHeader title={category} subtitle={`${items.length} trip${items.length !== 1 ? "s" : ""}`}/></div>
              {items.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No trips yet in this category</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {items.map((t) => (
                    <div key={t.id} onClick={() => openEdit(t)} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/50">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.destination}{t.defaultDays ? ` · ${t.defaultDays} days` : ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#0F4C81]">{t.basePrice != null ? formatCurrency(t.basePrice) : "—"}</div>
                        <div className="text-xs text-slate-400">per person</div>
                      </div>
                      <span className={cn("badge text-xs ml-3", t.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{t.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? "Edit Trip" : "Add Trip"} subtitle="Set the per-person base price">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Trip Name *</label>
            <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20" placeholder="Coorg Chikmaglur" required/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Destination *</label>
            <input value={form.destination} onChange={(e) => setForm(p => ({ ...p, destination: e.target.value }))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none" placeholder="Coorg & Chikmaglur" required/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Base Price / Person (₹)</label>
              <input type="number" value={form.basePrice} onChange={(e) => setForm(p => ({ ...p, basePrice: e.target.value }))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none" placeholder="7500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Default Days</label>
              <input type="number" value={form.defaultDays} onChange={(e) => setForm(p => ({ ...p, defaultDays: e.target.value }))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none" placeholder="3"/>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : form.id ? "Save Changes" : "Add Trip"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
