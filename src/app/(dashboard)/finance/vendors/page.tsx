"use client";
import { useEffect, useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { PageHeader, Card, Modal, StatCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Vendor { id: string; vendorCode: string; name: string; type: string; contactName?: string; phone?: string; city?: string; priceRate?: number; rateUnit?: string; isActive: boolean; }
const VENDOR_TYPES = ["Hotel","Transport","Guide","TatkalAgent","Other"];
const TYPE_COLOR: Record<string,string> = { Hotel:"bg-blue-100 text-blue-700", Transport:"bg-amber-100 text-amber-700", Guide:"bg-purple-100 text-purple-700", TatkalAgent:"bg-teal-100 text-teal-700", Other:"bg-slate-100 text-slate-600" };

export default function VendorsPage() {
  const [vendors,setVendors]=useState<Vendor[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [typeFilter,setTypeFilter]=useState("All");
  const [form,setForm]=useState({name:"",type:"Hotel",contactName:"",phone:"",email:"",city:"",address:"",gstNumber:"",bankName:"",accountNo:"",ifscCode:"",priceRate:"",rateUnit:"",notes:""});

  useEffect(()=>{ fetch("/api/vendors").then(r=>r.json()).then(j=>setVendors(j.data??[])).finally(()=>setLoading(false)); },[]);

  async function addVendor(e: React.FormEvent) {
    e.preventDefault();setSaving(true);
    try{
      const res=await fetch("/api/vendors",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,priceRate:form.priceRate?Number(form.priceRate):null})});
      const j=await res.json();
      if(!res.ok){toast.error(j.error??"Failed");return;}
      toast.success(`${form.name} added!`);setVendors(p=>[j.data,...p]);setModal(false);
    }catch{toast.error("Failed");}finally{setSaving(false);}
  }

  const filtered=typeFilter==="All"?vendors:vendors.filter(v=>v.type===typeFilter);

  return (
    <div className="space-y-5">
      <PageHeader title="Vendor Management" subtitle={`${vendors.length} vendors — managed by Finance, used by Logistics`} breadcrumb="Finance / Vendors"
        action={<button onClick={()=>setModal(true)} className="btn-primary"><Plus className="w-4 h-4"/> Add Vendor</button>}
      />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {VENDOR_TYPES.map(t=><StatCard key={t} label={t} value={vendors.filter(v=>v.type===t).length} icon={<Building2 className="w-4 h-4"/>} bg="bg-slate-50"/>)}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {["All",...VENDOR_TYPES].map(t=>(
          <button key={t} onClick={()=>setTypeFilter(t)}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
              typeFilter===t?"bg-[#0F4C81] text-white border-[#0F4C81]":"bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50")}>
            {t}
          </button>
        ))}
      </div>
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Code","Name","Type","Contact","Phone","City","Rate","Status"].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(v=>(
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="td font-mono text-xs font-bold text-[#0F4C81]">{v.vendorCode}</td>
                  <td className="td font-semibold text-sm text-slate-900">{v.name}</td>
                  <td className="td"><span className={cn("badge text-xs",TYPE_COLOR[v.type]??"")}>{v.type}</span></td>
                  <td className="td text-sm text-slate-600">{v.contactName??"—"}</td>
                  <td className="td text-sm text-slate-500">{v.phone??"—"}</td>
                  <td className="td text-sm text-slate-500">{v.city??"—"}</td>
                  <td className="td text-xs text-slate-500">{v.priceRate?`₹${v.priceRate.toLocaleString("en-IN")} ${v.rateUnit??""}`:"—"}</td>
                  <td className="td"><span className={cn("badge text-xs",v.isActive?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700")}>{v.isActive?"Active":"Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="Add Vendor" size="lg">
        <form onSubmit={addVendor} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20" required/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Type *</label><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none">{VENDOR_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            {[["contactName","Contact Name"],["phone","Phone"],["email","Email"],["city","City"],["priceRate","Price Rate"],["rateUnit","Rate Unit (e.g. per night)"],["gstNumber","GST Number"],["bankName","Bank Name"],["accountNo","Account No"],["ifscCode","IFSC Code"]].map(([k,l])=>(
              <div key={k}><label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
                <input value={(form as Record<string,string>)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none"/></div>
            ))}
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Saving...":"Add Vendor"}</button></div>
        </form>
      </Modal>
    </div>
  );
}