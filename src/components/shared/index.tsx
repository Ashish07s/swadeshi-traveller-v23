"use client";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import React from "react";
import {
  useReactTable, getCoreRowModel, getPaginationRowModel,
  getFilteredRowModel, flexRender, type ColumnDef,
} from "@tanstack/react-table";

// StatCard
export function StatCard({ label, value, icon, bg, color }: { label: string; value: string | number; icon?: React.ReactNode; bg?: string; color?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[#E2E8F0] p-4", bg ?? "bg-white")}>
      {icon && <div className="mb-2">{icon}</div>}
      <div className={cn("text-xl font-bold", color ?? "text-slate-900")}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

// Card
export function Card({ children, noPad, className }: { children: React.ReactNode; noPad?: boolean; className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-[#E2E8F0] shadow-sm", !noPad && "p-5", className)}>
      {children}
    </div>
  );
}

// PageHeader
export function PageHeader({ title, subtitle, breadcrumb, action }: { title: string; subtitle?: string; breadcrumb?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {breadcrumb && <div className="text-xs text-slate-400 mb-1">{breadcrumb}</div>}
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// SectionHeader
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// Modal
export function Modal({ open, onClose, title, subtitle, children, size = "md", contentClassName }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" | "sheet"; contentClassName?: string }) {
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl", sheet: "w-[95vw] max-w-[1600px]" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={cn("relative bg-white rounded-2xl shadow-xl w-full overflow-hidden", widths[size])}>
        <div className="flex items-start justify-between p-5 pb-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 flex-shrink-0 ml-3"><X className="w-4 h-4"/></button>
        </div>
        <div className={contentClassName ?? "p-5 overflow-y-auto max-h-[80vh]"}>{children}</div>
      </div>
    </div>
  );
}

// DataTable
export function DataTable<T>({ columns, data, loading, searchPlaceholder, pageSize = 10, emptyTitle }: { columns: ColumnDef<T>[]; data: T[]; loading?: boolean; searchPlaceholder?: string; pageSize?: number; emptyTitle?: string }) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getFilteredRowModel: getFilteredRowModel(), state: { globalFilter, pagination: { pageSize, pageIndex: 0 } }, onGlobalFilterChange: setGlobalFilter, initialState: { pagination: { pageSize } } });
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      {searchPlaceholder && (
        <div className="p-4 border-b border-[#E2E8F0]">
          <input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} placeholder={searchPlaceholder}
            className="w-full max-w-sm border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20"/>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>
      ) : table.getRowModel().rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><p className="font-medium">{emptyTitle ?? "No data"}</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-[#E2E8F0] whitespace-nowrap">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
          <span className="text-xs text-slate-400">{table.getFilteredRowModel().rows.length} results</span>
          <div className="flex gap-1.5">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}