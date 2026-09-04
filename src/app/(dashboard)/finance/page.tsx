"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IndianRupee, TrendingUp, AlertCircle, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { PageHeader, Card, StatCard, SectionHeader } from "@/components/shared";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FinancePage() {
  const [kpis,setKpis]=useState<Record<string,number>>({});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    fetch("/api/admin").then(r=>r.json()).then(j=>setKpis(j.data?.kpis??{})).catch(()=>toast.error("Failed")).finally(()=>setLoading(false));
  },[]);

  if(loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Finance Overview" subtitle="Revenue, collections, outstanding and pending approvals" breadcrumb="Finance"/>
      {kpis.pendingPayments>0&&(
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0"/>
          <span><strong>{kpis.pendingPayments} payment{kpis.pendingPayments>1?"s":""}</strong> awaiting Finance approval</span>
          <Link href="/finance/payments" className="ml-auto text-xs font-medium underline">Review now →</Link>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Revenue" value={formatCurrency(kpis.totalRevenue??0)} icon={<TrendingUp className="w-4 h-4 text-emerald-600"/>} bg="bg-emerald-50" color="text-emerald-600"/>
        <StatCard label="Total Collected" value={formatCurrency(kpis.totalCollected??0)} icon={<CheckCircle2 className="w-4 h-4 text-[#0F4C81]"/>} bg="bg-blue-50"/>
        <StatCard label="Outstanding" value={formatCurrency(kpis.outstanding??0)} icon={<AlertCircle className="w-4 h-4 text-red-500"/>} bg="bg-red-50" color="text-red-500"/>
        <StatCard label="Pending Approvals" value={kpis.pendingPayments??0} icon={<Clock className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Monthly Revenue" value={formatCurrency(kpis.monthRevenue??0)} icon={<IndianRupee className="w-4 h-4 text-purple-600"/>} bg="bg-purple-50" color="text-purple-600"/>
        <StatCard label="Fully Paid" value={kpis.paidFull??0} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600"/>} bg="bg-emerald-50" color="text-emerald-600"/>
        <StatCard label="Partially Paid" value={kpis.partial??0} icon={<CreditCard className="w-4 h-4 text-amber-600"/>} bg="bg-amber-50" color="text-amber-600"/>
        <StatCard label="Pending Refunds" value={kpis.pendingRefunds??0} icon={<AlertCircle className="w-4 h-4 text-orange-600"/>} bg="bg-orange-50" color="text-orange-600"/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/finance/payments" className="card-p flex items-center gap-3 hover:border-[#0F4C81]/40 transition-colors group cursor-pointer">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 group-hover:text-emerald-500"/>
          <div><div className="font-semibold text-slate-900">Payment Approvals</div><div className="text-xs text-slate-400">{kpis.pendingPayments??0} pending</div></div>
        </Link>
        <Link href="/operations/refunds" className="card-p flex items-center gap-3 hover:border-[#0F4C81]/40 transition-colors group cursor-pointer">
          <AlertCircle className="w-8 h-8 text-orange-400 group-hover:text-orange-500"/>
          <div><div className="font-semibold text-slate-900">Refunds</div><div className="text-xs text-slate-400">{kpis.pendingRefunds??0} pending</div></div>
        </Link>
        <Link href="/finance/vendors" className="card-p flex items-center gap-3 hover:border-[#0F4C81]/40 transition-colors group cursor-pointer">
          <IndianRupee className="w-8 h-8 text-blue-400 group-hover:text-blue-500"/>
          <div><div className="font-semibold text-slate-900">Vendor Management</div><div className="text-xs text-slate-400">Manage vendor master data</div></div>
        </Link>
      </div>
    </div>
  );
}