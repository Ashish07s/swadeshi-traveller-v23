"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, FileText, Truck, Receipt, Wrench, Settings,
  ChevronDown, ChevronRight, TicketCheck, CreditCard, Building2,
  AlertCircle, RefreshCw, Star, UserCog, BarChart3, ClipboardList,
  TrendingUp, PlusCircle, Hotel, Calendar, LogOut, IndianRupee,
  BookOpen, Ticket, UserCheck,
} from "lucide-react";
import Image from "next/image";
import { cn, ROLE_COLOR, ROLE_LABEL } from "@/lib/utils";

const ALL = ["admin","sales","ticket_admin","logistics","finance","operations","founder"];

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL },
  {
    label: "Sales", icon: FileText, roles: ["admin","sales","founder"],
    children: [
      { label: "All Bookings", href: "/sales/bookings", icon: ClipboardList },
      { label: "New Booking", href: "/sales/bookings/new", icon: PlusCircle },
      { label: "Customers", href: "/sales/customers", icon: Users },
      { label: "Lead Pipeline", href: "/sales/leads", icon: TrendingUp },
    ],
  },
  {
    label: "Ticket Admin", icon: TicketCheck, roles: ["admin","ticket_admin","founder"],
    children: [
      { label: "Inventory & Allocation", href: "/tickets", icon: Ticket },
    ],
  },
  {
    label: "Logistics", icon: Truck, roles: ["admin","logistics","founder"],
    children: [
      { label: "Overview", href: "/logistics", icon: LayoutDashboard },
      { label: "Allocate Hotel & Transport", href: "/logistics/allocate", icon: ClipboardList },
    ],
  },
  {
    label: "Operations", icon: Wrench, roles: ["admin","operations","founder"],
    children: [
      { label: "Overview", href: "/operations", icon: LayoutDashboard },
      { label: "Guide Master", href: "/operations/guides", icon: UserCheck },
      { label: "Assign Guide", href: "/operations/guides/assign", icon: Users },
      { label: "Customer Issues", href: "/operations/issues", icon: AlertCircle },
      { label: "Refunds", href: "/operations/refunds", icon: RefreshCw },
      { label: "Trip Feedback", href: "/operations/feedback", icon: Star },
    ],
  },
  {
    label: "Finance", icon: IndianRupee, roles: ["admin","finance","founder"],
    children: [
      { label: "Overview", href: "/finance", icon: LayoutDashboard },
      { label: "Payment Approval", href: "/finance/payments", icon: CreditCard },
      { label: "Trip Master", href: "/finance/trip-master", icon: FileText },
      { label: "Vendors", href: "/finance/vendors", icon: Building2 },
    ],
  },
  { label: "Calendar", href: "/calendar", icon: Calendar, roles: ALL },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin","sales","finance","founder"] },
  {
    label: "Admin", icon: UserCog, roles: ["admin","founder"],
    children: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Audit Logs", href: "/admin/audit", icon: BookOpen },
    ],
  },
  { label: "Settings", href: "/settings", icon: Settings, roles: ALL },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "sales";
  const [openGroups, setOpenGroups] = useState<string[]>(["Sales","Finance","Operations"]);

  function toggle(label: string) {
    setOpenGroups(p => p.includes(label) ? p.filter(x => x !== label) : [...p, label]);
  }

  return (
    <div className="w-60 flex-shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col h-screen sticky top-0 z-20">
      {/* Brand header */}
      <div className="p-4 border-b border-[#E2E8F0]" style={{background:"linear-gradient(135deg,#004A36,#006644)"}}>
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10 p-1.5">
            <Image src="/logo-icon.png" alt="Swadeshi" width={28} height={28} className="w-full h-full object-contain" priority/>
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight" style={{fontFamily:"'Barlow Condensed','Poppins',sans-serif",letterSpacing:"0.02em"}}>SWADESHI</div>
            <div className="text-[10px] text-green-300 font-medium">Traveller ERP</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
        {NAV.map((entry) => {
          if (entry.roles && !entry.roles.includes(role as never)) return null;
          if (!("children" in entry)) {
            const Icon = entry.icon;
            const active = pathname === entry.href;
            return (
              <Link key={entry.href} href={entry.href}
                className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  active ? "text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
                style={active ? {backgroundColor:"#00C46C"} : {}}>
                <Icon className="w-4 h-4 flex-shrink-0"/>{entry.label}
              </Link>
            );
          }
          const visibleChildren = entry.children.filter(() => true);
          if (visibleChildren.length === 0) return null;
          const isOpen = openGroups.includes(entry.label);
          const GroupIcon = entry.icon;
          const anyActive = visibleChildren.some(c => pathname.startsWith(c.href));
          return (
            <div key={entry.label}>
              <button onClick={() => toggle(entry.label)}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  anyActive ? "bg-green-50" : "text-slate-600 hover:bg-slate-100")}
                style={anyActive ? {color:"#004A36"} : {}}>
                <GroupIcon className="w-4 h-4 flex-shrink-0"/>
                <span className="flex-1 text-left">{entry.label}</span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-50"/> : <ChevronRight className="w-3.5 h-3.5 opacity-50"/>}
              </button>
              {isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 pl-2" style={{borderColor:"#E2E8F0"}}>
                  {visibleChildren.map(child => {
                    const ChildIcon = child.icon;
                    const active = pathname === child.href || (child.href.length > 1 && pathname.startsWith(child.href));
                    return (
                      <Link key={child.href} href={child.href}
                        className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                          active ? "text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}
                        style={active ? {backgroundColor:"#00C46C"} : {}}>
                        <ChildIcon className="w-3.5 h-3.5 flex-shrink-0"/>{child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 text-white" style={{backgroundColor:"#00C46C"}}>
            {(session?.user?.name ?? "U").split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">{session?.user?.name ?? "User"}</div>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", ROLE_COLOR[role])}>{ROLE_LABEL[role]}</span>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut className="w-3.5 h-3.5"/>Sign Out
        </button>
      </div>
    </div>
  );
}