"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Phone, Star, CheckCircle2, XCircle, Users, Clock, AlertCircle } from "lucide-react";
import { PageHeader, StatCard, Modal } from "@/components/shared";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Lead { id:string;customerName:string;phone:string;source:string;tripInterest?:string;budget?:number;stage:string;priority:string;createdAt:string;followUps:Array<{id:string;type:string;outcome?:string;doneAt:string}>;_count:{followUps:number}; }
const STAGES=["New","Contacted","Interested","Quoted","FollowUp","Converted","Lost"];
const SC:Record<string,string>={New:"bg-slate-100 text-slate-600",Contacted:"bg-blue-100 text-blue-700",Interested:"bg-purple-100 text-purple-700",Quoted:"bg-amber-100 text-amber-700",FollowUp:"bg-orange-100 text-orange-700",Converted:"bg-emerald-100 text-emerald-700",Lost:"bg-red-100 text-red-700"};
const PC:Record<string,string>={Low:"bg-slate-100 text-slate-500",Medium:"bg-blue-100 text-blue-600",High:"bg-amber-100 text-amber-700",Urgent:"bg-red-100 text-red-700"};

export default function LeadsPage(){
  const [leads,setLeads]=useState<Lead[]>([]);
  const [ov,setOv]=useState<Record<string,number>>({});
  const [loading,setLoading]=useState(true);
  const [addModal,setAddModal]=useState(false);
  const [fuLead,setFuLead]=useState<Lead|null>(null);
  const [view,setView]=useState<"kanban"|"table">("kanban");
  const [saving,setSaving]=useState(false);
  const [aForm,setAForm]=useState({customerName:"",phone:"",source:"WhatsApp",tripInterest:"",budget:"",groupSize:"",priority:"Medium",notes:""});
  const [fForm,setFForm]=useState({fuType:"Call",notes:"",outcome:"",nextFollowUp:""});

  const fetch_=useCallback(async()=>{
    setLoading(true);
    const [lr,or_]=await Promise.all([fetch("/api/leads"),fetch("/api/leads?type=overview")]);
    const [lj,oj]=await Promise.all([lr.json(),or_.json()]);
    setLeads(lj.data??[]);setOv(oj.data??{});setLoading(false);
  },[]);

  useEffect(()=>{fetch_();},[fetch_]);

  async function addLead(e:React.FormEvent){e.preventDefault();setSaving(true);try{await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(aForm)});toast.success("Lead added!");setAddModal(false);fetch_();}catch{toast.error("Failed");}finally{setSaving(false);}}
  async function addFU(e:React.FormEvent){e.preventDefault();if(!fuLead)return;setSaving(true);try{await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"follow-up",leadId:fuLead.id,...fForm})});toast.success("Follow-up recorded!");setFuLead(null);fetch_();}catch{toast.error("Failed");}finally{setSaving(false);}}
  async function moveStage(id:string,stage:string){await fetch("/api/leads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,stage})});fetch_();}

  const byStage=STAGES.reduce<Record<string,Lead[]>>((a,s)=>{a[s]=leads.filter(l=>l.stage===s);return a;},{});
  const inp="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20";
  const lbl="block text-xs font-medium text-slate-600 mb-1";

  return(
    <div className="space-y-5">
      <PageHeader title="Lead Pipeline" subtitle={`${leads.length} leads · ${ov.conversionRate??0}% conversion`} breadcrumb="Sales"
        action={<div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">{(["kanban","table"] as const).map(v=><button key={v} onClick={()=>setView(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",view===v?"bg-white shadow-sm text-slate-900":"text-slate-500")}>{v==="kanban"?"🗂️ Pipeline":"📋 Table"}</button>)}</div>
          <button onClick={()=>setAddModal(true)} className="btn-primary"><Plus className="w-4 h-4"/> Add Lead</button>
        </div>}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={ov.total??0} icon={<Users className="w-4 h-4 text-[#0F4C81]"/>} bg="bg-blue-50"/>
        <StatCard label="Interested" value={ov.interested??0} icon={<Star className="w-4 h-4 text-purple-600"/>} bg="bg-purple-50" color="text-purple-600"/>
        <StatCard label="Converted" value={ov.converted??0} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600"/>} bg="bg-emerald-50" color="text-emerald-600"/>
        <StatCard label="Today Follow-Ups" value={ov.todayFollowUps??0} icon={<Clock className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
      </div>
      {(ov.todayFollowUps??0)>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2"><AlertCircle className="w-4 h-4"/><strong>{ov.todayFollowUps} follow-up{ov.todayFollowUps!==1?"s":""} due today!</strong></div>}
      {view==="kanban"&&(
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STAGES.map(stage=>{
            const sl=byStage[stage]??[];
            return(
              <div key={stage} className={cn("rounded-2xl border min-h-[180px]",SC[stage])}>
                <div className="px-3 py-2 rounded-t-xl flex items-center justify-between border-b border-current/20">
                  <span className="text-xs font-semibold truncate">{stage}</span>
                  <span className="text-xs font-bold opacity-70 ml-1">{sl.length}</span>
                </div>
                <div className="p-1.5 space-y-1.5">
                  {sl.map(lead=>(
                    <div key={lead.id} className="bg-white rounded-xl p-2.5 shadow-card border border-white">
                      <div className="font-semibold text-xs text-slate-900 truncate">{lead.customerName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-2.5 h-2.5"/>{lead.phone}</div>
                      {lead.tripInterest&&<div className="text-[10px] text-[#0F4C81] font-medium mt-0.5 truncate">{lead.tripInterest}</div>}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={cn("badge text-[9px]",PC[lead.priority])}>{lead.priority}</span>
                        {lead.budget&&<span className="text-[9px] text-slate-400">{formatCurrency(lead.budget)}</span>}
                      </div>
                      <button onClick={()=>setFuLead(lead)} className="w-full mt-1.5 text-[10px] font-medium bg-[#0F4C81] text-white rounded-lg py-1 hover:bg-[#0d3f6e]">Follow Up</button>
                    </div>
                  ))}
                  {sl.length===0&&<div className="text-center py-4 text-[10px] text-slate-400">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {view==="table"&&(
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr>{["Name","Phone","Source","Trip Interest","Budget","Priority","Stage","Follow-Ups",""].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {leads.map(l=>(
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="td font-semibold text-sm text-slate-900">{l.customerName}</td>
                  <td className="td text-sm text-slate-500">{l.phone}</td>
                  <td className="td"><span className="badge text-xs bg-blue-100 text-blue-700">{l.source}</span></td>
                  <td className="td text-sm text-slate-600">{l.tripInterest??"—"}</td>
                  <td className="td text-sm">{l.budget?formatCurrency(l.budget):"—"}</td>
                  <td className="td"><span className={cn("badge text-xs",PC[l.priority])}>{l.priority}</span></td>
                  <td className="td"><select value={l.stage} onChange={e=>moveStage(l.id,e.target.value)} className={cn("text-xs px-2 py-1 rounded-lg border-transparent font-medium cursor-pointer focus:outline-none",SC[l.stage])}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></td>
                  <td className="td text-xs text-slate-400">{l._count.followUps}</td>
                  <td className="td"><button onClick={()=>setFuLead(l)} className="text-xs text-[#0F4C81] hover:underline font-medium">Follow Up</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
      <Modal open={addModal} onClose={()=>setAddModal(false)} title="Add Lead" size="lg">
        <form onSubmit={addLead} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[["customerName","Name *","text",true],["phone","Phone *","text",true],["source","Source","text",false],["tripInterest","Trip Interest","text",false],["budget","Budget (₹)","number",false],["groupSize","Group Size","number",false]].map(([k,l,t,r])=>(
              <div key={k as string}><label className={lbl}>{l as string}</label><input type={t as string} value={(aForm as Record<string,string>)[k as string]} onChange={e=>setAForm(p=>({...p,[k as string]:e.target.value}))} className={inp} required={!!r}/></div>
            ))}
          </div>
          <div><label className={lbl}>Notes</label><textarea value={aForm.notes} onChange={e=>setAForm(p=>({...p,notes:e.target.value}))} rows={2} className={cn(inp,"resize-none")}/></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setAddModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Saving...":"Add Lead"}</button></div>
        </form>
      </Modal>
      <Modal open={!!fuLead} onClose={()=>setFuLead(null)} title="Record Follow-Up" subtitle={fuLead?`${fuLead.customerName} · ${fuLead.phone}`:""}>
        <form onSubmit={addFU} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Type</label><select value={fForm.fuType} onChange={e=>setFForm(p=>({...p,fuType:e.target.value}))} className={inp}>{["Call","WhatsApp","Email","Visit","Meeting"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label className={lbl}>Outcome</label><select value={fForm.outcome} onChange={e=>setFForm(p=>({...p,outcome:e.target.value}))} className={inp}><option value="">Select...</option>{["Interested","NotInterested","CallBack","Converted","NoAnswer"].map(o=><option key={o}>{o}</option>)}</select></div>
          </div>
          <div><label className={lbl}>Notes</label><textarea value={fForm.notes} onChange={e=>setFForm(p=>({...p,notes:e.target.value}))} rows={3} className={cn(inp,"resize-none")} placeholder="What was discussed..."/></div>
          <div><label className={lbl}>Next Follow-Up</label><input type="datetime-local" value={fForm.nextFollowUp} onChange={e=>setFForm(p=>({...p,nextFollowUp:e.target.value}))} className={inp}/></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={()=>setFuLead(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?"Saving...":"Record"}</button></div>
        </form>
      </Modal>
    </div>
  );
}