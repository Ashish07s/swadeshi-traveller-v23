"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCheck, Plus, Users } from "lucide-react";
import { PageHeader, Card, Modal } from "@/components/shared";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Guide { id: string; guideCode: string; name: string; phone?: string|null; email?: string|null; city?: string|null; languages?: string|null; specialization?: string|null; experience?: string|null; status: string; notes?: string|null }

const empty = { name: "", phone: "", email: "", city: "", languages: "", specialization: "", experience: "", notes: "" };
const statusBadge = (s: string) => cn("badge text-xs", s === "Active" ? "bg-emerald-100 text-emerald-700" : s === "OnLeave" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500");

export default function GuideMasterPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const r = await fetch("/api/guides"); const j = await r.json(); setGuides(j.data ?? []); }
    catch { toast.error("Failed to load guides"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(g: Guide) { setEditing(g); setForm({ name: g.name, phone: g.phone||"", email: g.email||"", city: g.city||"", languages: g.languages||"", specialization: g.specialization||"", experience: g.experience||"", notes: g.notes||"" }); setModal(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Guide name is required"); return; }
    setSaving(true);
    try {
      const url = "/api/guides";
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const j = await res.json(); toast.error(j.error || "Failed"); return; }
      toast.success(editing ? "Guide updated" : "Guide added");
      setModal(false); load();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function setStatus(g: Guide, status: string) {
    try { await fetch("/api/guides", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id, status }) }); toast.success(`Marked ${status}`); load(); }
    catch { toast.error("Failed"); }
  }

  const inputCls = "w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20";

  return (
    <div className="space-y-5">
      <PageHeader title="Guide Master" subtitle={`${guides.length} guides on roster`} breadcrumb="Operations / Guide Master"
        action={<div className="flex gap-2">
          <Link href="/operations/guides/assign" className="btn-secondary text-xs py-2"><Users className="w-3.5 h-3.5"/> Assign Guide</Link>
          <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4"/> Add Guide</button>
        </div>}
      />
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>
        ) : guides.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40"/><p className="font-medium">No guides added yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{["Guide","Contact","City","Languages","Specialization","Experience","Status","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-[#E2E8F0]">{h}</th>)}</tr></thead>
              <tbody>
                {guides.map(g => (
                  <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm"><div className="font-medium text-slate-900">{g.name}</div><div className="text-xs text-slate-400">{g.guideCode}</div></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{g.phone || "—"}{g.email ? ` · ${g.email}` : ""}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{g.city || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{g.languages || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{g.specialization || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{g.experience || "—"}</td>
                    <td className="px-4 py-3"><span className={statusBadge(g.status)}>{g.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <button onClick={() => openEdit(g)} className="text-[#0F4C81] hover:underline font-medium">Edit</button>
                        {g.status === "Active" ? (
                          <>
                            <button onClick={() => setStatus(g, "OnLeave")} className="text-amber-600 hover:underline">On Leave</button>
                            <button onClick={() => setStatus(g, "Inactive")} className="text-slate-400 hover:underline">Deactivate</button>
                          </>
                        ) : (
                          <button onClick={() => setStatus(g, "Active")} className="text-emerald-600 hover:underline">Activate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Guide" : "Add Guide"} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Guide Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} required/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">City</label><input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className={inputCls}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Languages</label><input value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} placeholder="Hindi, English, Marathi" className={inputCls}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Specialization</label><input value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} placeholder="Trekking, Heritage, Wildlife" className={inputCls}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Experience</label><input value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} placeholder="5 years" className={inputCls}/></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} rows={2}/></div>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : editing ? "Save Changes" : "Add Guide"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
