"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { PageHeader, Card, StatCard } from "@/components/shared";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Payment {
  id: string; paymentCode: string;
  amount: number; paymentMethod: string; utrNumber?: string;
  approvalStatus: string; enteredBy?: string; enteredByRole?: string;
  rejectionReason?: string; approvedBy?: string;
  createdAt: string;
  booking: { bookingCode: string; customerName: string; tripName: string; finalPackageCost: number };
}

const STATUS_COLOR: Record<string,string> = {
  Pending:"bg-amber-100 text-amber-700",Submitted:"bg-blue-100 text-blue-700",
  UnderReview:"bg-purple-100 text-purple-700",Approved:"bg-emerald-100 text-emerald-700",
  Rejected:"bg-red-100 text-red-700",Processed:"bg-slate-100 text-slate-600",
};

export default function FinancePaymentsPage() {
  const [payments,setPayments]=useState<Payment[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("Pending");
  const [rejectId,setRejectId]=useState<string|null>(null);
  const [rejectReason,setRejectReason]=useState("");
  const [processing,setProcessing]=useState<string|null>(null);

  useEffect(()=>{fetchPayments();},[filter]);

  async function fetchPayments(){
    setLoading(true);
    try{
      const res=await fetch(`/api/payments?status=${filter}`);
      const j=await res.json();
      setPayments(j.data??[]);
    }catch{toast.error("Failed");}
    finally{setLoading(false);}
  }

  async function doAction(id:string,act:string,reason?:string){
    setProcessing(id);
    try{
      const res=await fetch(`/api/payments/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:act,reason})});
      const j=await res.json();
      if(!res.ok){toast.error(j.error??"Failed");return;}
      toast.success(`Payment ${act}d!`);
      setRejectId(null);setRejectReason("");
      fetchPayments();
    }catch{toast.error("Failed");}
    finally{setProcessing(null);}
  }

  const pending=payments.filter(p=>["Pending","Submitted","UnderReview"].includes(p.approvalStatus)).length;
  const totalPending=payments.filter(p=>["Pending","Submitted","UnderReview"].includes(p.approvalStatus)).reduce((s,p)=>s+p.amount,0);

  return (
    <div className="space-y-5">
      <PageHeader title="Payment Approval" subtitle="Finance team reviews and approves all payments" breadcrumb="Finance"/>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending Approval" value={pending} icon={<Clock className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
        <StatCard label="Pending Amount" value={formatCurrency(totalPending)} icon={<AlertCircle className="w-4 h-4 text-red-500"/>} bg="bg-red-50" color="text-red-500"/>
        <StatCard label="Approved" value={payments.filter(p=>p.approvalStatus==="Approved").length} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600"/>} bg="bg-emerald-50" color="text-emerald-600"/>
        <StatCard label="Rejected" value={payments.filter(p=>p.approvalStatus==="Rejected").length} icon={<XCircle className="w-4 h-4 text-red-500"/>} bg="bg-red-50" color="text-red-500"/>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
        Only Finance/Admin can approve or reject. Sales cannot approve their own payments. Rejection reason is mandatory.
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {["Pending","Submitted","UnderReview","Approved","Rejected","All"].map((s)=>(
          <button key={s} onClick={()=>setFilter(s)}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
              filter===s?"bg-[#0F4C81] text-white border-[#0F4C81]":"bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50")}>
            {s}
          </button>
        ))}
      </div>
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        payments.length===0?<p className="text-center py-12 text-slate-400 text-sm">No payments for this filter</p>:
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Code","Customer","Trip","Amount","Method","UTR","Entered By","Status","Actions"].map(h=><th key={h} className="th whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {payments.map(p=>(
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="td font-mono text-xs font-bold text-[#0F4C81]">{p.paymentCode}</td>
                  <td className="td"><div className="font-medium text-sm">{p.booking.customerName}</div><div className="font-mono text-xs text-slate-400">{p.booking.bookingCode}</div></td>
                  <td className="td text-sm text-slate-600 max-w-[120px] truncate">{p.booking.tripName}</td>
                  <td className="td font-bold text-[#0F4C81]">{formatCurrency(p.amount)}</td>
                  <td className="td text-sm">{p.paymentMethod}</td>
                  <td className="td font-mono text-xs">{p.utrNumber??<span className="text-red-400 font-semibold">Missing!</span>}</td>
                  <td className="td text-xs text-slate-500">{p.enteredBy}<div className="text-slate-400 capitalize">{p.enteredByRole}</div></td>
                  <td className="td"><span className={cn("badge text-xs",STATUS_COLOR[p.approvalStatus]??"")}>{p.approvalStatus}</span>{p.rejectionReason&&<div className="text-xs text-red-500 mt-0.5 max-w-[100px] truncate">{p.rejectionReason}</div>}</td>
                  <td className="td">
                    {["Pending","Submitted","UnderReview"].includes(p.approvalStatus)&&(
                      <div className="flex gap-1.5">
                        <button onClick={()=>doAction(p.id,"approve")} disabled={processing===p.id}
                          className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                          {processing===p.id?"...":"Approve"}
                        </button>
                        <button onClick={()=>setRejectId(p.id)} className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">Reject</button>
                      </div>
                    )}
                    {p.approvalStatus==="Approved"&&<span className="text-xs text-emerald-600 font-medium">✓ by {p.approvedBy}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </Card>
      {rejectId&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-3">Reject Payment</h3>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rejection Reason <span className="text-red-500">*</span></label>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={3} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200 resize-none" placeholder="Reason for rejection..."/>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={()=>{setRejectId(null);setRejectReason("");}} className="btn-secondary">Cancel</button>
              <button onClick={()=>doAction(rejectId,"reject",rejectReason)} disabled={!rejectReason||processing===rejectId}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {processing===rejectId?"Rejecting...":"Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}