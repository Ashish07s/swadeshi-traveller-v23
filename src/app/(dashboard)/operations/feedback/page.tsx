"use client";
import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/shared";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Feedback { id:string;overallRating?:number;accommodationRating?:number;transportRating?:number;guideRating?:number;comments?:string;createdAt:string;booking:{bookingCode:string;customerName:string;tripName:string}; }

function Stars({ n }: { n?: number }) {
  if (!n) return <span className="text-slate-400 text-xs">—</span>;
  return <span className="text-amber-400">{"★".repeat(n)}{"☆".repeat(5-n)}</span>;
}

export default function FeedbackPage(){
  const [feedback,setFeedback]=useState<Feedback[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ fetch("/api/operations?type=feedback").then(r=>r.json()).then(j=>setFeedback(j.data??[])).finally(()=>setLoading(false)); },[]);
  const avg = feedback.length > 0 ? (feedback.reduce((s,f)=>s+(f.overallRating??0),0)/feedback.length).toFixed(1) : "—";

  return(
    <div className="space-y-5">
      <PageHeader title="Trip Feedback" subtitle={`${feedback.length} reviews · Average: ${avg}/5`} breadcrumb="Operations"/>
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        feedback.length===0?<p className="text-center py-12 text-slate-400 text-sm">No feedback yet</p>:
        <div className="divide-y divide-slate-50">
          {feedback.map(f=>(
            <div key={f.id} className="px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{f.booking.customerName}</div>
                  <div className="text-xs text-slate-400 font-mono">{f.booking.bookingCode} · {f.booking.tripName}</div>
                </div>
                <div className="text-right"><Stars n={f.overallRating}/><div className="text-xs text-slate-400 mt-0.5">{formatDate(f.createdAt)}</div></div>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                {[["Hotel",f.accommodationRating],["Transport",f.transportRating],["Places",undefined],["Guide",f.guideRating]].map(([l,v])=>(
                  <div key={l as string} className="bg-slate-50 rounded-lg p-2"><div className="text-slate-400 mb-0.5">{l as string}</div><Stars n={v as number|undefined}/></div>
                ))}
              </div>
              {f.comments&&<p className="text-sm text-slate-600 mt-2 italic">"{f.comments}"</p>}
            </div>
          ))}
        </div>}
      </Card>
    </div>
  );
}