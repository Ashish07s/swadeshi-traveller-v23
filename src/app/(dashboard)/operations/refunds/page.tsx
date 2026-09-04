"use client";
import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { PageHeader, Card, Modal, StatCard } from "@/components/shared";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Refund { id:string;reason:string;amount:number;status:string;paymentMethod?:string;utrNumber?:string;createdAt:string;booking:{bookingCode:string;customerName:string;phoneNumber:string}; }

export default function RefundsPage(){
  const [refunds,setRefunds]=useState<Refund[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [bookings,setBookings]=useState<Array<{id:string;bookingCode:string;customerName:string}>>([]);
  const [form,setForm]=useState({bookingId:"",reason:"",amount:"",paymentMethod:"UPI",utrNumber:"",notes:""});

  useEffect(()=>{
    Promise.all([
      fetch("/api/operations?type=refunds").then(r=>r.json()),
      fetch("/api/bookings").then(r=>r.json()),
    ]).then(([rj,bj])=>{setRefunds(rj.data??[]);setBookings(bj.data??[]);}).finally(()=>setLoading(false));
  },[]);

  async function addRefund(e:React.FormEvent){
    e.preventDefault();
    if(!form.reason.trim()){toast.error("Refund reason is mandatory");return;}
    setSaving(true);
    try{await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"refund",...form,amount:Number(form.amount)})});
    toast.success("Refund requested — Finance notified!");setModal(false);
    const r=await fetch("/api/operations?type=refunds");const j=await r.json();setRefunds(j.data??[]);}
    catch{toast.error("Failed");}finally{setSaving(false);}
  }

  const inp="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20";
  const lbl="block text-xs font-medium text-slate-600 mb-1";
  const needsUTR=["UPI","NEFT","RTGS","IMPS"].includes(form.paymentMethod);

  return(
    <div className="space-y-5">
      <PageHeader title="Refunds" subtitle="Refund reason mandatory. Finance auto-notified." breadcrumb="Operations"
        action={<button onClick={()=>setModal(true)} className="btn-primary"><Plus className="w-4 h-4"/> Request Refund</button>}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Requested" value={refunds.filter(r=>r.status==="Requested").length} icon={<RefreshCw className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
        <StatCard label="Approved" value={refunds.filter(r=>r.status==="Approved").length} icon={<RefreshCw className="w-4 h-4 text-emerald-600"/>} bg="bg-emerald-50" color="text-emerald-600"/>
        <StatCard label="Total Amount" value={formatCurrency(refunds.reduce((s,r)=>s+r.amount,0))} icon={<RefreshCw className="w-4 h-4 text-red-500"/>} bg="bg-red-50" color="text-red-500"/>
      </div>
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        refunds.length===0?<p className="text-center py-12 text-slate-400 text-sm">No refunds yet</p>:
        <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Booking","Customer","Reason","Amount","Method","UTR","Status","Created"].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{refunds.map(r=>(
            <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="td font-mono text-xs font-bold text-[#0F4C81]">{r.booking.bookingCode}</td>
              <td className="td font-medium text-sm">{r.booking.customerName}</td>
              <td className="td text-sm text-slate-600 max-w-[160px] truncate">{r.reason}</td>
              <td className="td font-bold text-red-500">{formatCurrency(r.amount)}</td>
              <td className="td text-sm">{r.paymentMethod??"—"}</td>
              <td className="td font-mono text-xs">{r.utrNumber??"—"}</td>
              <td className="td"><span className={cn("badge text-xs",r.status==="Requested"?"bg-amber-100 text-amber-700":r.status==="Paid"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700")}>{r.status}</span></td>
              <td className="td text-xs text-slate-400">{formatDate(r.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table></div>}
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="Request Refund">
        <form onSubmit={addRefund} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">Reason is mandatory. Finance will be auto-notified.</div>
          <div><label className={lbl}>Booking *</label><select value={form.bookingId} onChange={e=>setForm(p=>({...p,bookingId:e.target.value}))} className={inp} required><option value="">— Select booking —</option>{bookings.map(b=><option key={b.id} value={b.id}>{b.bookingCode} — {b.customerName}</option>)}</select></div>
          <div><label className={lbl}>Reason *</label><textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} rows={3} className={cn(inp,"resize-none")} required placeholder="Mandatory — explain why refund is needed"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Amount (₹) *</label><input type="number" min="1" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className={inp} required/></div>
            <div><label className={lbl}>Payment Method</label><select value={form.paymentMethod} onChange={e=>setForm(p=>({...p,paymentMethod:e.target.value}))} className={inp}>{["UPI","NEFT","RTGS","Cash","Cheque"].map(m=><option key={m}>{m}</option>)}</select></div>
          </div>
          {needsUTR&&<div><label className={lbl}>UTR / Reference *</label><input value={form.utrNumber} onChange={e=>setForm(p=>({...p,utrNumber:e.target.value}))} className={inp} required={needsUTR}/></div>}
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Submitting...":"Request Refund"}</button></div>
        </form>
      </Modal>
    </div>
  );
}