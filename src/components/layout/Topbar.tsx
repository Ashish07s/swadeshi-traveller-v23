"use client";
import { useSession } from "next-auth/react";

export function Topbar() {
  const { data: session } = useSession();
  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center px-5 sticky top-0 z-10">
      <div className="flex-1"/>
      <div className="text-sm text-slate-500 font-medium">{session?.user?.name}</div>
    </header>
  );
}