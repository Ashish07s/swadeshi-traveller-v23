"use client";
import { useSession } from "next-auth/react";
import { PageHeader, Card } from "@/components/shared";
import { ROLE_LABEL, ROLE_COLOR, cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Settings" subtitle="Your account and preferences" breadcrumb="Settings"/>
      <Card>
        <div className="font-semibold text-slate-900 mb-4">Account Information</div>
        <div className="space-y-4">
          {[
            { label: "Name", value: session?.user?.name ?? "—" },
            { label: "Email", value: session?.user?.email ?? "—" },
            { label: "Role", value: <span className={cn("badge text-xs", ROLE_COLOR[session?.user?.role ?? "sales"])}>{ROLE_LABEL[session?.user?.role ?? "sales"]}</span> },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-4 py-3 border-b border-[#E2E8F0] last:border-0">
              <div className="text-sm text-slate-500 w-24 flex-shrink-0">{f.label}</div>
              <div className="text-sm font-medium text-slate-900">{f.value}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="font-semibold text-slate-900 mb-3">Module Access</div>
        <div className="text-xs text-slate-500 leading-relaxed">
          Access is controlled by your role. Contact Admin to change permissions.
        </div>
        <div className="mt-3 text-sm text-slate-600">
          Your role: <span className={cn("badge text-xs ml-1", ROLE_COLOR[session?.user?.role ?? "sales"])}>{ROLE_LABEL[session?.user?.role ?? "sales"]}</span>
        </div>
      </Card>
    </div>
  );
}