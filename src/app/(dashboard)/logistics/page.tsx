"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Hotel, Truck, Building2, Plus, ClipboardList } from "lucide-react";
import { PageHeader, Card, StatCard, Modal } from "@/components/shared";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LogisticsPage() {
  const [hotels,setHotels]=useState<Array<Record<string,unknown>>>([]);
  const [transports,setTransports]=useState<Array<Record<string,unknown>>>([]);
  const [vendors,setVendors]=useState<Array<{id:string;name:string;type:string;isActive:boolean}>>([]);
  const [loading,setLoading]=useState(true);
  const [hotelModal,setHotelModal]=useState(false);
  const [transportModal,setTransportModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [hForm,setHForm]=useState({tripName:"",hotelName:"",city:"",area:"",vendorId:"",checkIn:"",checkOut:"",roomCount:"1",guestCount:"1",roomType:"",ratePerRoom:"",mealPlan:"",confirmationNo:"",hotelPhone:"",specialRequests:""});
  const [tForm,setTForm]=useState({tripName:"",vendorId:"",vehicleType:"",vehicleNumber:"",driverName:"",driverPhone:"",capacity:"",pickupLocation:"",dropLocation:"",pickupDate:"",pickupTime:"",cost:""});

  useEffect(()=>{
    Promise.all([
      fetch("/api/hotel-bookings").then(r=>r.json()),
      fetch("/api/operations?type=transports").then(r=>r.json()),
      fetch("/api/vendors").then(r=>r.json()),
    ]).then(([h,t,v])=>{ setHotels(h.data??[]); setTransports(t.data??[]); setVendors(v.data??[]); }).catch(()=>toast.error("Failed")).finally(()=>setLoading(false));
  },[]);

  async function addHotel(e:React.FormEvent){
    e.preventDefault();setSaving(true);
    try{ await fetch("/api/hotel-bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(hForm)}); toast.success("Hotel booked!"); setHotelModal(false); }
    catch{toast.error("Failed");}finally{setSaving(false);}
  }
  async function addTransport(e:React.FormEvent){
    e.preventDefault();setSaving(true);
    try{ await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"transport",...tForm})}); toast.success("Transport booked!"); setTransportModal(false); }
    catch{toast.error("Failed");}finally{setSaving(false);}
  }

  const inputCls="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20";

  return (
    <div className="space-y-5">
      <PageHeader title="Logistics" subtitle="Hotel bookings, transport and vendor management" breadcrumb="Logistics"
        action={<div className="flex gap-2"><button onClick={()=>setHotelModal(true)} className="btn-secondary text-xs py-2"><Hotel className="w-3.5 h-3.5"/> Book Hotel</button><button onClick={()=>setTransportModal(true)} className="btn-secondary text-xs py-2"><Truck className="w-3.5 h-3.5"/> Add Transport</button><Link href="/logistics/allocate" className="btn-primary"><ClipboardList className="w-4 h-4"/> Allocate Hotel & Transport</Link></div>}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Hotels" value={hotels.length} icon={<Hotel className="w-4 h-4 text-[#0F4C81]"/>} bg="bg-blue-50"/>
        <StatCard label="Transports" value={transports.length} icon={<Truck className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
        <Link href="/finance/vendors" className="card-p flex items-center gap-3 hover:border-[#0F4C81]/40 cursor-pointer"><Building2 className="w-5 h-5 text-purple-600"/><div><div className="font-semibold text-slate-900">Vendors</div><div className="text-xs text-slate-400">{vendors.length} active · managed by Finance</div></div></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card noPad>
          <div className="flex items-center justify-between p-5 pb-0"><div className="font-semibold text-slate-900">Hotel Bookings ({hotels.length})</div></div>
          {loading?<div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
          hotels.length===0?<p className="text-center py-8 text-slate-400 text-sm">No hotel bookings yet</p>:
          <div className="divide-y divide-slate-50">
            {hotels.slice(0,6).map(h=>(
              <div key={h.id as string} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-slate-900">{h.hotelName as string}</div>
                  <div className="text-xs text-slate-400">{h.city as string} · {formatDate(h.checkIn as string)} → {formatDate(h.checkOut as string)}</div>
                  <div className="text-xs text-slate-400">{h.roomCount as number} rooms · {(h.roomType as string)??"—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm text-[#0F4C81]">{formatCurrency(h.totalCost as number)}</div>
                  <span className={cn("badge text-xs",h.status==="Confirmed"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700")}>{h.status as string}</span>
                </div>
              </div>
            ))}
          </div>}
        </Card>
        <Card noPad>
          <div className="flex items-center justify-between p-5 pb-0"><div className="font-semibold text-slate-900">Transport ({transports.length})</div></div>
          {loading?<div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
          transports.length===0?<p className="text-center py-8 text-slate-400 text-sm">No transports booked yet</p>:
          <div className="divide-y divide-slate-50">
            {transports.slice(0,6).map(t=>(
              <div key={t.id as string} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-slate-900">{(t.vehicleType as string)??"Vehicle"} {(t.vehicleNumber as string)?"·"+(t.vehicleNumber as string):""}</div>
                  <div className="text-xs text-slate-400">{(t.driverName as string)??"No driver"} · {(t.pickupLocation as string)??"—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm text-[#0F4C81]">{formatCurrency(t.cost as number)}</div>
                  <span className="badge text-xs bg-amber-100 text-amber-700">{t.status as string}</span>
                </div>
              </div>
            ))}
          </div>}
        </Card>
      </div>
      <Modal open={hotelModal} onClose={()=>setHotelModal(false)} title="Book Hotel" size="lg">
        <form onSubmit={addHotel} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[["tripName","Trip Name"],["hotelName","Hotel Name *"],["city","City"],["area","Area/Locality"],["checkIn","Check-in Date:date"],["checkOut","Check-out Date:date"],["roomCount","Rooms:number"],["guestCount","Guests:number"],["ratePerRoom","Rate/Room (₹):number"],["roomType","Room Type"],["mealPlan","Meal Plan"],["confirmationNo","Confirmation No."],["hotelPhone","Hotel Phone"]].map(([k,l])=>{
              const [label,type]=(l as string).split(":");
              const key=k as string;
              return <div key={key}><label className="block text-xs font-medium text-slate-600 mb-1">{label}</label><input type={type??"text"} value={(hForm as Record<string,string>)[key]} onChange={e=>setHForm(p=>({...p,[key]:e.target.value}))} className={inputCls} required={label.includes("*")}/></div>;
            })}
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Vendor</label><select value={hForm.vendorId} onChange={e=>setHForm(p=>({...p,vendorId:e.target.value}))} className={inputCls}><option value="">— Select vendor (optional) —</option>{vendors.filter(v=>v.type==="Hotel"&&v.isActive).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setHotelModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Booking...":"Book Hotel"}</button></div>
        </form>
      </Modal>
      <Modal open={transportModal} onClose={()=>setTransportModal(false)} title="Add Transport" size="lg">
        <form onSubmit={addTransport} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[["tripName","Trip Name"],["vehicleType","Vehicle Type"],["vehicleNumber","Vehicle Number"],["driverName","Driver Name"],["driverPhone","Driver Phone"],["capacity","Capacity:number"],["pickupLocation","Pickup Location"],["dropLocation","Drop Location"],["pickupDate","Pickup Date:date"],["pickupTime","Pickup Time:time"],["cost","Cost (₹):number"]].map(([k,l])=>{
              const [label,type]=(l as string).split(":");
              const key=k as string;
              return <div key={key}><label className="block text-xs font-medium text-slate-600 mb-1">{label}</label><input type={type??"text"} value={(tForm as Record<string,string>)[key]} onChange={e=>setTForm(p=>({...p,[key]:e.target.value}))} className={inputCls}/></div>;
            })}
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Vendor</label><select value={tForm.vendorId} onChange={e=>setTForm(p=>({...p,vendorId:e.target.value}))} className={inputCls}><option value="">— Select vendor —</option>{vendors.filter(v=>v.type==="Transport"&&v.isActive).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setTransportModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Adding...":"Add Transport"}</button></div>
        </form>
      </Modal>
    </div>
  );
}