"use client";
import { useEffect, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { PageHeader, Card, Modal, StatCard } from "@/components/shared";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Issue { id:string;concern:string;status:string;assignedTo?:string;notes?:string;createdAt:string;booking:{bookingCode:string;customerName:string}; }

export default function IssuesPage(){
  const [issues,setIssues]=useState<Issue[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [bookings,setBookings]=useState<Array<{id:string;bookingCode:string;customerName:string}>>([]);
  const [form,setForm]=useState({bookingId:"",concern:"",responsibility:"",assignedTo:"",notes:""});

  useEffect(()=>{
    Promise.all([
      fetch("/api/operations?type=issues").then(r=>r.json()),
      fetch("/api/bookings").then(r=>r.json()),
    ]).then(([ij,bj])=>{setIssues(ij.data??[]);setBookings(bj.data??[]);}).finally(()=>setLoading(false));
  },[]);

  async function addIssue(e:React.FormEvent){
    e.preventDefault();setSaving(true);
    try{await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"issue",...form})});toast.success("Issue logged!");setModal(false);
    const r=await fetch("/api/operations?type=issues");const j=await r.json();setIssues(j.data??[]);}
    catch{toast.error("Failed");}finally{setSaving(false);}
  }

  async function updateStatus(id:string,status:string){
    await fetch("/api/operations",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"issue",id,status})});
    setIssues(p=>p.map(i=>i.id===id?{...i,status}:i));
    toast.success("Status updated!");
  }

  const inp="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20";
  const lbl="block text-xs font-medium text-slate-600 mb-1";

  return(
    <div className="space-y-5">
      <PageHeader title="Customer Issues" subtitle={`${issues.filter(i=>i.status==="Open").length} open issues`} breadcrumb="Operations"
        action={<button onClick={()=>setModal(true)} className="btn-primary"><Plus className="w-4 h-4"/> Log Issue</button>}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Open" value={issues.filter(i=>i.status==="Open").length} icon={<AlertCircle className="w-4 h-4 text-red-500"/>} bg="bg-red-50" color="text-red-500"/>
        <StatCard label="In Progress" value={issues.filter(i=>i.status==="InProgress").length} icon={<AlertCircle className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
        <StatCard label="Resolved" value={issues.filter(i=>i.status==="Resolved").length} icon={<AlertCircle className="w-4 h-4 text-emerald-600"/>} bg="bg-emerald-50" color="text-emerald-600"/>
      </div>
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        issues.length===0?<p className="text-center py-12 text-slate-400 text-sm">No issues logged</p>:
        <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Booking","Customer","Issue","Assigned To","Status","Created","Action"].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{issues.map(i=>(
            <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="td font-mono text-xs font-bold text-[#0F4C81]">{i.booking.bookingCode}</td>
              <td className="td font-medium text-sm">{i.booking.customerName}</td>
              <td className="td text-sm text-slate-700 max-w-[200px]">{i.concern}</td>
              <td className="td text-xs text-slate-500">{i.assignedTo??"—"}</td>
              <td className="td"><span className={cn("badge text-xs",i.status==="Open"?"bg-red-100 text-red-700":i.status==="InProgress"?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700")}>{i.status}</span></td>
              <td className="td text-xs text-slate-400">{formatDate(i.createdAt)}</td>
              <td className="td"><select value={i.status} onChange={e=>updateStatus(i.id,e.target.value)} className="text-xs border border-[#E2E8F0] rounded-lg px-2 py-1 outline-none">
                {["Open","InProgress","Resolved","Closed"].map(s=><option key={s}>{s}</option>)}
              </select></td>
            </tr>
          ))}</tbody>
        </table></div>}
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="Log Customer Issue">
        <form onSubmit={addIssue} className="space-y-4">
          <div><label className={lbl}>Booking *</label><select value={form.bookingId} onChange={e=>setForm(p=>({...p,bookingId:e.target.value}))} className={inp} required><option value="">— Select booking —</option>{bookings.map(b=><option key={b.id} value={b.id}>{b.bookingCode} — {b.customerName}</option>)}</select></div>
          <div><label className={lbl}>Issue / Concern *</label><textarea value={form.concern} onChange={e=>setForm(p=>({...p,concern:e.target.value}))} rows={3} className={cn(inp,"resize-none")} required/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Responsibility</label><input value={form.responsibility} onChange={e=>setForm(p=>({...p,responsibility:e.target.value}))} className={inp}/></div>
            <div><label className={lbl}>Assigned To</label><input value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:e.target.value}))} className={inp}/></div>
          </div>
          <div><label className={lbl}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} className={cn(inp,"resize-none")}/></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Saving...":"Log Issue"}</button></div>
        </form>
      </Modal>
    </div>
  );
}