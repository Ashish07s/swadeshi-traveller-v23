"use client";
import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { PageHeader, Card } from "@/components/shared";
import { formatCurrency, formatDate, cn, PAYMENT_STATUS_COLOR } from "@/lib/utils";
import { toast } from "sonner";

interface Customer { id: string; customerId: string; name: string; phone: string; city?: string; totalBookings: number; createdAt: string; bookings: Array<{ id: string; bookingCode: string; tripName: string; journeyDate: string; finalPackageCost: number; paymentStatus: string; status: string }>; _count: { bookings: number }; }

export default function CustomersPage() {
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState<string|null>(null);

  useEffect(()=>{ fetchCustomers(); },[]);

  async function fetchCustomers(){
    setLoading(true);
    try{ const res=await fetch(`/api/customers${search?`?search=${search}`:""}`); const j=await res.json(); setCustomers(j.data??[]); }
    catch{toast.error("Failed");}
    finally{setLoading(false);}
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" subtitle={`${customers.length} customers — each with a permanent Customer ID`} breadcrumb="Sales"/>
      <div className="flex gap-3">
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchCustomers()} className="text-sm outline-none bg-transparent flex-1" placeholder="Search name, phone, CUS ID..."/>
        </div>
        <button onClick={fetchCustomers} className="btn-secondary text-xs py-2">Search</button>
      </div>
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        <div className="divide-y divide-slate-50">
          {customers.map(c=>(
            <div key={c.id}>
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50" onClick={()=>setExpanded(expanded===c.id?null:c.id)}>
                <div className="w-10 h-10 rounded-full bg-[#0F4C81]/10 flex items-center justify-center text-[#0F4C81] font-bold text-sm flex-shrink-0">
                  {c.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[#0F4C81]">{c.customerId}</span>
                    <span>·</span><span>{c.phone}</span>
                    {c.city&&<><span>·</span><span>{c.city}</span></>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-[#0F4C81]">{c._count.bookings} booking{c._count.bookings!==1?"s":""}</div>
                  <div className="text-xs text-slate-400">since {new Date(c.createdAt).getFullYear()}</div>
                </div>
              </div>
              {expanded===c.id&&c.bookings.length>0&&(
                <div className="px-5 pb-4 bg-slate-50/50 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 pt-3">Booking History</div>
                  <div className="space-y-1.5">
                    {c.bookings.map(b=>(
                      <div key={b.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                        <span className="font-mono text-xs font-bold text-[#0F4C81]">{b.bookingCode}</span>
                        <span className="text-sm text-slate-700 flex-1 truncate">{b.tripName}</span>
                        <span className="text-xs text-slate-400">{formatDate(b.journeyDate)}</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(b.finalPackageCost)}</span>
                        <span className={cn("badge text-xs",PAYMENT_STATUS_COLOR[b.paymentStatus])}>{b.paymentStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {customers.length===0&&!loading&&<p className="text-center py-12 text-slate-400 text-sm">No customers found</p>}
        </div>}
      </Card>
    </div>
  );
}