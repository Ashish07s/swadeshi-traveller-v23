"use client";
import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/shared";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AuditLog { id: string; userName?: string; action: string; entity: string; entityId?: string; module?: string; reason?: string; createdAt: string; newValue?: unknown; }

const ACTION_COLOR: Record<string,string> = { CREATE:"bg-emerald-100 text-emerald-700", UPDATE:"bg-blue-100 text-blue-700", DELETE:"bg-red-100 text-red-700", APPROVE:"bg-purple-100 text-purple-700", REJECT:"bg-red-100 text-red-700", CANCEL:"bg-amber-100 text-amber-700" };

export default function AuditPage() {
  const [logs,setLogs]=useState<AuditLog[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ fetch("/api/admin/audit").then(r=>r.json()).then(j=>setLogs(j.data??[])).catch(()=>toast.error("Failed")).finally(()=>setLoading(false)); },[]);

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle={`${logs.length} recent actions`} breadcrumb="Admin"/>
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Time","User","Action","Entity","Module","Reason","Value"].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {logs.map(l=>(
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="td text-xs text-slate-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("en-IN")}</td>
                  <td className="td text-sm font-medium">{l.userName??"System"}</td>
                  <td className="td"><span className={cn("badge text-xs",ACTION_COLOR[l.action]??"bg-slate-100 text-slate-600")}>{l.action}</span></td>
                  <td className="td text-sm text-slate-600">{l.entity}</td>
                  <td className="td text-xs text-slate-400">{l.module??""}</td>
                  <td className="td text-xs text-slate-500 max-w-[120px] truncate">{l.reason??""}</td>
                  <td className="td text-xs font-mono text-slate-400 max-w-[120px] truncate">{l.newValue ? JSON.stringify(l.newValue).slice(0,50) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </Card>
    </div>
  );
}