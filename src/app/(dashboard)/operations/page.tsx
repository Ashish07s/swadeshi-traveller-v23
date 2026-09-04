"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Star, Truck, Hotel, Plus, UserCheck } from "lucide-react";
import { PageHeader, StatCard, Card, Modal } from "@/components/shared";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function OperationsPage() {
  const [overview, setOverview] = useState<Record<string,number>>({});
  const [issues, setIssues] = useState<Array<Record<string,unknown>>>([]);
  const [refunds, setRefunds] = useState<Array<Record<string,unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/operations?type=overview").then(r => r.json()),
      fetch("/api/operations?type=issues").then(r => r.json()),
      fetch("/api/operations?type=refunds").then(r => r.json()),
    ]).then(([ov, is, rf]) => {
      setOverview(ov.data ?? {});
      setIssues((is.data ?? []).slice(0, 5));
      setRefunds((rf.data ?? []).slice(0, 5));
    }).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Operations" subtitle="Customer issues, refunds, feedback and transport" breadcrumb="Operations"
        action={<Link href="/operations/guides" className="btn-primary"><UserCheck className="w-4 h-4"/> Guide Master</Link>}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Open Issues" value={overview.openIssues ?? 0} icon={<AlertCircle className="w-4 h-4 text-red-500"/>} bg="bg-red-50" color="text-red-500"/>
        <StatCard label="Pending Refunds" value={overview.pendingRefunds ?? 0} icon={<RefreshCw className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
        <StatCard label="Feedback Count" value={overview.feedbackCount ?? 0} icon={<Star className="w-4 h-4 text-purple-600"/>} bg="bg-purple-50" color="text-purple-600"/>
        <StatCard label="Transports" value={overview.transports ?? 0} icon={<Truck className="w-4 h-4 text-[#0F4C81]"/>} bg="bg-blue-50"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card noPad>
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="font-semibold text-slate-900">Recent Issues</div>
            <Link href="/operations/issues" className="text-xs text-[#0F4C81] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {issues.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">No open issues</p> :
              issues.map((i) => (
                <div key={i.id as string} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-slate-900 truncate max-w-[200px]">{i.concern as string}</div>
                    <span className={cn("badge text-xs", i.status === "Open" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{i.status as string}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{(i.booking as Record<string,string>)?.customerName}</div>
                </div>
              ))
            }
          </div>
        </Card>
        <Card noPad>
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="font-semibold text-slate-900">Pending Refunds</div>
            <Link href="/operations/refunds" className="text-xs text-[#0F4C81] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {refunds.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">No pending refunds</p> :
              refunds.map((r) => (
                <div key={r.id as string} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{(r.booking as Record<string,string>)?.customerName}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[160px]">{r.reason as string}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-red-500">{formatCurrency(r.amount as number)}</div>
                    <span className="badge text-xs bg-amber-100 text-amber-700">{r.status as string}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/operations/issues" className="card-p flex items-center gap-3 hover:border-[#0F4C81]/40 transition-colors cursor-pointer group">
          <AlertCircle className="w-8 h-8 text-red-400 group-hover:text-red-500"/>
          <div><div className="font-semibold text-slate-900">Customer Issues</div><div className="text-xs text-slate-400">Track and resolve issues</div></div>
        </Link>
        <Link href="/operations/refunds" className="card-p flex items-center gap-3 hover:border-[#0F4C81]/40 transition-colors cursor-pointer group">
          <RefreshCw className="w-8 h-8 text-amber-400 group-hover:text-amber-500"/>
          <div><div className="font-semibold text-slate-900">Refunds</div><div className="text-xs text-slate-400">Process customer refunds</div></div>
        </Link>
        <Link href="/operations/feedback" className="card-p flex items-center gap-3 hover:border-[#0F4C81]/40 transition-colors cursor-pointer group">
          <Star className="w-8 h-8 text-purple-400 group-hover:text-purple-500"/>
          <div><div className="font-semibold text-slate-900">Trip Feedback</div><div className="text-xs text-slate-400">Customer ratings and comments</div></div>
        </Link>
      </div>
    </div>
  );
}