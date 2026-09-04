"use client";
import { useEffect, useState } from "react";
import { Download, BarChart3, TrendingUp, FileText, Filter } from "lucide-react";
import { PageHeader, Card, SectionHeader } from "@/components/shared";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS=["#0F4C81","#3B82F6","#8B5CF6","#F59E0B","#10B981","#EF4444","#6B7280"];

export default function ReportsPage() {
  const [data,setData]=useState<Record<string,unknown>|null>(null);
  const [loading,setLoading]=useState(true);
  const [range,setRange]=useState("6months");
  const [tab,setTab]=useState("overview");

  useEffect(()=>{
    setLoading(true);
    fetch(`/api/reports?range=${range}`).then(r=>r.json()).then(j=>setData(j.data??{})).catch(()=>toast.error("Failed")).finally(()=>setLoading(false));
  },[range]);

  function exportCSV(){
    if(!data) return;
    const rows=[["Month","Bookings","Revenue","Collected"],...((data.monthlyRevenue as Array<Record<string,unknown>>)??[]).map(m=>[m.label,m.bookings,m.revenue,m.collected])];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a=document.createElement("a");a.href=url;a.download=`report-${new Date().toISOString().split("T")[0]}.csv`;a.click();
    toast.success("Exported!");
  }

  if(loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>;
  const kpis=(data?.kpis as Record<string,number>)??{};
  const monthly=(data?.monthlyRevenue as Array<Record<string,unknown>>)??[];
  const statusBD=(data?.statusBreakdown as Array<Record<string,unknown>>)??[];
  const sourceBD=(data?.leadSourceBreakdown as Array<Record<string,unknown>>)??[];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Business insights across all modules" breadcrumb="Reports"
        action={
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-slate-400"/>
              <select value={range} onChange={e=>setRange(e.target.value)} className="text-sm text-slate-700 outline-none bg-transparent">
                <option value="1month">Last 1 Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last 1 Year</option>
              </select>
            </div>
            <button onClick={exportCSV} className="btn-secondary text-xs py-2"><Download className="w-3.5 h-3.5"/> Export CSV</button>
          </div>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {label:"Total Revenue",value:formatCurrency(kpis.totalRevenue??0),color:"text-[#0F4C81]",bg:"bg-blue-50"},
          {label:"Collected",value:formatCurrency(kpis.totalCollected??0),color:"text-emerald-600",bg:"bg-emerald-50"},
          {label:"Outstanding",value:formatCurrency(kpis.totalOutstanding??0),color:"text-red-500",bg:"bg-red-50"},
          {label:"Total Bookings",value:kpis.totalBookings??0,color:"text-slate-900",bg:"bg-slate-50"},
          {label:"Completed",value:kpis.completedTrips??0,color:"text-emerald-600",bg:"bg-emerald-50"},
          {label:"Cancelled",value:kpis.cancelledTrips??0,color:"text-red-500",bg:"bg-red-50"},
        ].map(s=><div key={s.label} className={cn("rounded-2xl border border-[#E2E8F0] p-4",s.bg)}><div className={cn("text-xl font-display font-bold",s.color)}>{s.value}</div><div className="text-xs text-slate-500 mt-0.5">{s.label}</div></div>)}
      </div>
      <div className="flex gap-1.5 border-b border-[#E2E8F0]">
        {[{id:"overview",label:"Overview",icon:BarChart3},{id:"revenue",label:"Revenue",icon:TrendingUp},{id:"bookings",label:"Bookings",icon:FileText}].map(t=>{
          const Icon=t.icon;
          return <button key={t.id} onClick={()=>setTab(t.id)} className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all",tab===t.id?"border-[#0F4C81] text-[#0F4C81]":"border-transparent text-slate-500")}><Icon className="w-4 h-4"/>{t.label}</button>;
        })}
      </div>
      {tab==="overview"&&(
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card><SectionHeader title="Booking Status"/>
            <div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusBD} dataKey="count" cx="50%" cy="50%" outerRadius={65} innerRadius={35} strokeWidth={2} stroke="white">{statusBD.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{fontSize:11,borderRadius:10}}/></PieChart></ResponsiveContainer></div>
            <div className="space-y-1.5 mt-2">{statusBD.map((s,i)=><div key={s.status as string} className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background:COLORS[i%COLORS.length]}}/><span className="text-slate-600">{s.status as string}</span></div><span className="font-semibold">{s.count as number}</span></div>)}</div>
          </Card>
          <Card><SectionHeader title="Lead Sources"/>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={sourceBD} layout="vertical" margin={{left:0}}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="source" tick={{fontSize:10}} width={80}/><Tooltip contentStyle={{fontSize:11,borderRadius:10}}/><Bar dataKey="count" fill="#0F4C81" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
          </Card>
          <Card><SectionHeader title="Revenue Trend"/>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly.slice(-4)} margin={{top:5,right:5,bottom:5,left:0}}><defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0F4C81" stopOpacity={0.15}/><stop offset="95%" stopColor="#0F4C81" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="label" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`}/><Tooltip formatter={(v:number)=>[formatCurrency(v)]} contentStyle={{fontSize:11,borderRadius:10}}/><Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0F4C81" strokeWidth={2} fill="url(#rv)"/></AreaChart></ResponsiveContainer></div>
          </Card>
        </div>
      )}
      {tab==="revenue"&&(
        <Card><SectionHeader title="Monthly Revenue vs Collections"/>
          <div className="h-64 mb-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly} margin={{top:5,right:5,bottom:5,left:0}}><defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0F4C81" stopOpacity={0.15}/><stop offset="95%" stopColor="#0F4C81" stopOpacity={0}/></linearGradient><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="label" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`}/><Tooltip formatter={(v:number)=>[formatCurrency(v)]} contentStyle={{fontSize:11,borderRadius:10}}/><Legend wrapperStyle={{fontSize:12}}/><Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0F4C81" strokeWidth={2} fill="url(#r)"/><Area type="monotone" dataKey="collected" name="Collected" stroke="#10B981" strokeWidth={2} fill="url(#c)"/></AreaChart></ResponsiveContainer></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Month","Bookings","Revenue","Collected","Outstanding","Collection%"].map(h=><th key={h} className="th">{h}</th>)}</tr></thead><tbody>{[...monthly].reverse().map(m=>{const out=(m.revenue as number)-(m.collected as number);const pct=(m.revenue as number)>0?Math.round(((m.collected as number)/(m.revenue as number))*100):0;return(<tr key={m.label as string} className="border-b border-slate-50 hover:bg-slate-50/50"><td className="td font-semibold">{m.label as string}</td><td className="td">{m.bookings as number}</td><td className="td font-semibold text-[#0F4C81]">{formatCurrency(m.revenue as number)}</td><td className="td text-emerald-600 font-medium">{formatCurrency(m.collected as number)}</td><td className={cn("td font-medium",out>0?"text-red-500":"text-emerald-600")}>{out>0?formatCurrency(out):"—"}</td><td className="td"><div className="flex items-center gap-2"><div className="h-1.5 w-14 bg-slate-100 rounded-full overflow-hidden"><div className={cn("h-full rounded-full",pct>=80?"bg-emerald-500":pct>=50?"bg-amber-400":"bg-red-400")} style={{width:`${pct}%`}}/></div><span className="text-xs font-medium">{pct}%</span></div></td></tr>);})}</tbody></table></div>
        </Card>
      )}
      {tab==="bookings"&&(
        <Card noPad>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Booking","Customer","Trip","Journey","Package","Paid","Balance","Status","Sales"].map(h=><th key={h} className="th whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
            {((data?.recentBookings as Array<Record<string,unknown>>)??[]).map(b=>(
              <tr key={b.id as string} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="td font-mono text-xs font-bold text-[#0F4C81]">{b.bookingCode as string}</td>
                <td className="td font-medium">{b.customerName as string}</td>
                <td className="td text-slate-600 max-w-[130px] truncate">{b.tripName as string}</td>
                <td className="td whitespace-nowrap">{formatDate(b.journeyDate as string)}</td>
                <td className="td font-semibold">{formatCurrency(b.finalPackageCost as number)}</td>
                <td className="td text-emerald-600 font-medium">{formatCurrency(b.totalPaid as number)}</td>
                <td className={cn("td font-medium",(b.balanceDue as number)>0?"text-red-500":"text-emerald-600")}>{(b.balanceDue as number)>0?formatCurrency(b.balanceDue as number):"—"}</td>
                <td className="td"><span className="badge text-xs bg-blue-100 text-blue-700">{b.status as string}</span></td>
                <td className="td text-xs text-slate-500">{b.salesPersonName as string??""}</td>
              </tr>
            ))}
          </tbody></table></div>
        </Card>
      )}
    </div>
  );
}