"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Ticket, CheckCircle2, Clock, Download } from "lucide-react";
import { PageHeader, DataTable, StatCard, Modal, Card } from "@/components/shared";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";

interface TktItem { id: string; inventoryCode: string; travelMode: string; fromLocation: string; toLocation: string; travelDate: string; departureTime?: string; coachClass?: string; totalSeats: number; availableSeats: number; costPrice: number; sellingPrice: number; status: string; pnrNumber?: string; operator?: string; trainFlightNo?: string; }
interface Alloc { id: string; bookingId: string; seatNumber?: string; pnrNumber?: string; costPrice: number; status: string; allocatedBy?: string; createdAt: string; ticket: { fromLocation: string; toLocation: string; travelDate: string }; booking: { bookingCode: string; customerName: string; tripName: string }; passenger?: { name: string }; }
const ST_COLOR: Record<string,string> = { Available:"bg-emerald-100 text-emerald-700", Reserved:"bg-amber-100 text-amber-700", Assigned:"bg-blue-100 text-blue-700", Cancelled:"bg-red-100 text-red-700", Used:"bg-slate-100 text-slate-500" };

export default function TicketsPage() {
  const [tab,setTab]=useState<"inventory"|"allocations">("inventory");
  const [tickets,setTickets]=useState<TktItem[]>([]);
  const [allocs,setAllocs]=useState<Alloc[]>([]);
  const [bookings,setBookings]=useState<Array<{id:string;bookingCode:string;customerName:string;tripName:string;passengers:Array<{id:string;name:string;ticketStatus:string}>}>>([]);
  const [loading,setLoading]=useState(true);
  const [addModal,setAddModal]=useState(false);
  const [allocModal,setAllocModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [addForm,setAddForm]=useState({travelMode:"Train",operator:"",trainFlightNo:"",fromLocation:"",toLocation:"",travelDate:"",departureTime:"",arrivalTime:"",coachClass:"",totalSeats:"1",costPrice:"",sellingPrice:"",pnrNumber:"",notes:""});
  const [allocForm,setAllocForm]=useState({ticketId:"",bookingId:"",passengerId:"",seatNumber:"",coachNumber:"",pnrNumber:""});

  const fetchAll=useCallback(async()=>{
    setLoading(true);
    try{
      const [tr,al,bk]=await Promise.all([
        fetch("/api/tickets?type=inventory").then(r=>r.json()),
        fetch("/api/tickets?type=allocations").then(r=>r.json()),
        fetch("/api/bookings?limit=100").then(r=>r.json()),
      ]);
      setTickets(tr.data??[]);setAllocs(al.data??[]);
      const enriched=await Promise.all((bk.data??[]).map(async(b:Record<string,unknown>)=>{
        const pr=await fetch(`/api/bookings/${b.id}`).then(r=>r.json());
        return {...b,passengers:pr.data?.passengers??[]};
      }));
      setBookings(enriched);
    }catch{toast.error("Failed");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  async function addTicket(e:React.FormEvent){
    e.preventDefault();setSaving(true);
    try{
      const res=await fetch("/api/tickets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"add-inventory",...addForm})});
      if(!res.ok){const j=await res.json();toast.error(j.error??"Failed");return;}
      toast.success("Ticket added to inventory!");setAddModal(false);fetchAll();
    }catch{toast.error("Failed");}finally{setSaving(false);}
  }

  async function allocateTicket(e:React.FormEvent){
    e.preventDefault();setSaving(true);
    try{
      const res=await fetch("/api/tickets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"allocate",...allocForm})});
      const j=await res.json();
      if(!res.ok){toast.error(j.error??"Failed");return;}
      toast.success("Ticket allocated!");setAllocModal(false);fetchAll();
    }catch{toast.error("Failed");}finally{setSaving(false);}
  }

  const selectedBooking=bookings.find(b=>b.id===allocForm.bookingId);
  const eligiblePassengers=selectedBooking?.passengers?.filter(p=>p.ticketStatus==="Pending")??[];

  const tktCols: ColumnDef<TktItem>[] = [
    {header:"Code",cell:({row})=><span className="font-mono text-xs font-bold text-[#0F4C81]">{row.original.inventoryCode}</span>},
    {header:"Route",cell:({row})=>{const t=row.original;return<div><div className="font-medium text-sm">{t.fromLocation} → {t.toLocation}</div><div className="text-xs text-slate-400">{t.travelMode} {t.trainFlightNo?`· ${t.trainFlightNo}`:""} {t.coachClass?`· ${t.coachClass}`:""}</div></div>;}},
    {header:"Date",cell:({row})=><div><div className="text-sm">{formatDate(row.original.travelDate)}</div><div className="text-xs text-slate-400">{row.original.departureTime??""}</div></div>},
    {header:"Seats",cell:({row})=>{const t=row.original;return<div><span className="font-bold text-emerald-600">{t.availableSeats}</span><span className="text-slate-400 text-xs"> / {t.totalSeats}</span></div>;}},
    {header:"Cost",cell:({row})=><span className="text-red-500 font-medium">{formatCurrency(row.original.costPrice)}</span>},
    {header:"Selling",cell:({row})=><span className="text-[#0F4C81] font-bold">{formatCurrency(row.original.sellingPrice)}</span>},
    {header:"PNR",cell:({row})=><span className="font-mono text-xs">{row.original.pnrNumber??"—"}</span>},
    {header:"Status",cell:({row})=><span className={cn("badge text-xs",ST_COLOR[row.original.status]??"")}>{row.original.status}</span>},
    {id:"allocate",header:"",cell:({row})=>row.original.availableSeats>0?<button onClick={()=>{setAllocForm(p=>({...p,ticketId:row.original.id}));setAllocModal(true);}} className="text-xs text-[#0F4C81] hover:underline font-medium">Allocate →</button>:null},
  ];

  const alCols: ColumnDef<Alloc>[] = [
    {header:"Route",cell:({row})=>{const a=row.original;return<div><div className="font-medium text-sm">{a.ticket.fromLocation} → {a.ticket.toLocation}</div><div className="text-xs text-slate-400">{formatDate(a.ticket.travelDate)}</div></div>;}},
    {header:"Booking",cell:({row})=>{const a=row.original;return<div><div className="font-mono text-xs font-bold text-[#0F4C81]">{a.booking.bookingCode}</div><div className="text-sm">{a.booking.customerName}</div></div>;}},
    {header:"Passenger",cell:({row})=><span className="text-sm">{row.original.passenger?.name??"—"}</span>},
    {header:"Seat",cell:({row})=><span className="font-mono text-sm">{row.original.seatNumber??"—"}</span>},
    {header:"PNR",cell:({row})=><span className="font-mono text-xs">{row.original.pnrNumber??"—"}</span>},
    {header:"Cost",cell:({row})=><span className="font-medium">{formatCurrency(row.original.costPrice)}</span>},
    {header:"Status",cell:({row})=><span className={cn("badge text-xs",row.original.status==="Allocated"?"bg-blue-100 text-blue-700":row.original.status==="Confirmed"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700")}>{row.original.status}</span>},
    {header:"By",cell:({row})=><span className="text-xs text-slate-400">{row.original.allocatedBy??"—"}</span>},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Ticket Admin" subtitle="Pre-booked inventory + customer allocation — auto-populates from Sales bookings" breadcrumb="Tickets"
        action={<div className="flex gap-2"><button onClick={()=>setAllocModal(true)} className="btn-secondary text-xs py-2">Allocate Ticket</button><button onClick={()=>setAddModal(true)} className="btn-primary"><Plus className="w-4 h-4"/> Add to Inventory</button></div>}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
        <strong>Auto-populated:</strong> Bookings and passengers come from Sales. Allocate pre-booked inventory to eligible customers.
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Inventory" value={tickets.length} icon={<Ticket className="w-4 h-4 text-[#0F4C81]"/>} bg="bg-blue-50"/>
        <StatCard label="Available" value={tickets.filter(t=>t.status==="Available").length} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600"/>} bg="bg-emerald-50" color="text-emerald-600"/>
        <StatCard label="Allocations" value={allocs.length} icon={<Clock className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
        <StatCard label="Confirmed" value={allocs.filter(a=>a.status==="Confirmed").length} icon={<CheckCircle2 className="w-4 h-4 text-purple-600"/>} bg="bg-purple-50" color="text-purple-600"/>
      </div>
      <div className="flex gap-1.5">
        {(["inventory","allocations"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-all capitalize",t===tab?"border-[#0F4C81] text-[#0F4C81]":"border-transparent text-slate-500")}>
            {t==="inventory"?"Ticket Inventory":"Allocations"}
          </button>
        ))}
      </div>
      {tab==="inventory"&&<DataTable columns={tktCols} data={tickets} loading={loading} searchPlaceholder="Search by route, code..." pageSize={10} emptyTitle="No tickets in inventory"/>}
      {tab==="allocations"&&<DataTable columns={alCols} data={allocs} loading={loading} searchPlaceholder="Search by customer, booking..." pageSize={10} emptyTitle="No allocations yet"/>}

      <Modal open={addModal} onClose={()=>setAddModal(false)} title="Add Ticket to Inventory" size="lg">
        <form onSubmit={addTicket} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[["fromLocation","From Location","text",true],["toLocation","To Location","text",true],["travelDate","Travel Date","date",true],["departureTime","Departure Time","time",false],["operator","Operator / Airline","text",false],["trainFlightNo","Train / Flight No.","text",false],["coachClass","Coach / Class","text",false],["totalSeats","Total Seats","number",false],["costPrice","Cost Price (₹)","number",true],["sellingPrice","Selling Price (₹)","number",true],["pnrNumber","PNR Number","text",false]].map(([k,l,t,r])=>(
              <div key={k as string}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{l as string}{r&&<span className="text-red-500"> *</span>}</label>
                <input type={t as string} value={(addForm as Record<string,string>)[k as string]} onChange={e=>setAddForm(p=>({...p,[k as string]:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20" required={!!r}/>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setAddModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Adding...":"Add Ticket"}</button></div>
        </form>
      </Modal>

      <Modal open={allocModal} onClose={()=>setAllocModal(false)} title="Allocate Ticket" subtitle="Select booking and passenger from Sales" size="lg">
        <form onSubmit={allocateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Available Ticket *</label>
            <select value={allocForm.ticketId} onChange={e=>setAllocForm(p=>({...p,ticketId:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20" required>
              <option value="">— Select ticket —</option>
              {tickets.filter(t=>t.availableSeats>0).map(t=><option key={t.id} value={t.id}>{t.fromLocation} → {t.toLocation} · {formatDate(t.travelDate)} · {t.availableSeats} avail</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sales Booking *</label>
            <select value={allocForm.bookingId} onChange={e=>setAllocForm(p=>({...p,bookingId:e.target.value,passengerId:""}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none" required>
              <option value="">— Select booking —</option>
              {bookings.map(b=><option key={b.id} value={b.id}>{b.bookingCode} — {b.customerName} — {b.tripName}</option>)}
            </select>
          </div>
          {eligiblePassengers.length>0&&(
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Passenger</label>
              <select value={allocForm.passengerId} onChange={e=>setAllocForm(p=>({...p,passengerId:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none">
                <option value="">— Select passenger —</option>
                {eligiblePassengers.map(p=><option key={p.id} value={p.id}>{p.name} ({p.ticketStatus})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[["seatNumber","Seat Number"],["coachNumber","Coach Number"],["pnrNumber","Override PNR"]].map(([k,l])=>(
              <div key={k}><label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
                <input value={(allocForm as Record<string,string>)[k]} onChange={e=>setAllocForm(p=>({...p,[k]:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none"/></div>
            ))}
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setAllocModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Allocating...":"Allocate"}</button></div>
        </form>
      </Modal>
    </div>
  );
}