import { SessionProvider } from "next-auth/react";
import { Shell } from "@/components/layout/Shell";
import { Toaster } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
      <Toaster position="top-right" richColors/>
    </SessionProvider>
  );
}