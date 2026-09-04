"use client";
import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const DEMO_USERS = [
  { label: "Admin", email: "admin@swadeshitraveller.com", color: "bg-purple-100 text-purple-700" },
  { label: "Sales", email: "sales@swadeshitraveller.com", color: "bg-blue-100 text-blue-700" },
  { label: "Tickets", email: "tickets@swadeshitraveller.com", color: "bg-indigo-100 text-indigo-700" },
  { label: "Logistics", email: "logistics@swadeshitraveller.com", color: "bg-amber-100 text-amber-700" },
  { label: "Finance", email: "finance@swadeshitraveller.com", color: "bg-emerald-100 text-emerald-700" },
  { label: "Operations", email: "operations@swadeshitraveller.com", color: "bg-teal-100 text-teal-700" },
  { label: "Founder", email: "founder@swadeshitraveller.com", color: "bg-rose-100 text-rose-700" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) { setError("Invalid email or password"); return; }
      router.push("/dashboard");
    } catch { setError("Login failed"); }
    finally { setLoading(false); }
  }

  async function demoLogin(demoEmail: string) {
    setLoading(true); setError("");
    try {
      const res = await signIn("credentials", { email: demoEmail, password: "demo@123", redirect: false });
      if (res?.error) { setError("Demo login failed"); return; }
      router.push("/dashboard");
    } catch { setError("Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-10 text-white" style={{background:"linear-gradient(160deg, #004A36 0%, #006644 50%, #00C46C 100%)"}}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center p-2" style={{backgroundColor:"rgba(255,255,255,0.15)"}}>
            <Image src="/logo-icon.png" alt="Swadeshi" width={32} height={32} className="w-full h-full object-contain" priority/>
          </div>
          <div>
            <div className="font-bold text-xl tracking-wide" style={{fontFamily:"'Barlow Condensed','Poppins',sans-serif"}}>SWADESHI</div>
            <div className="text-green-300 text-xs">Traveller Community</div>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{fontFamily:"'Barlow Condensed','Poppins',sans-serif"}}>
            Your Complete<br/>Travel ERP
          </h1>
          <p className="text-green-200 text-sm leading-relaxed">
            Sales · Ticketing · Logistics · Finance · Operations<br/>
            All modules. One platform.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[["Sales & CRM","Bookings, Leads, Customers"],["Finance","Payments, Approvals"],["Operations","Issues, Refunds, Feedback"]].map(([t,d])=>(
              <div key={t} className="rounded-xl p-3" style={{backgroundColor:"rgba(255,255,255,0.1)"}}>
                <div className="font-semibold text-sm">{t}</div>
                <div className="text-green-300 text-xs mt-0.5">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-green-400 text-xs">© 2026 Swadeshi Traveller Community Pvt Ltd</div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center p-2.5" style={{backgroundColor:"#00C46C"}}>
              <Image src="/logo-icon.png" alt="Swadeshi" width={40} height={40} className="w-full h-full object-contain" priority/>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Swadeshi Traveller</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in to your ERP account</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl mb-4">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="your@email.com" required/>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="••••••••" required/>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full text-white rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
              style={{backgroundColor: loading ? "#00a85b" : "#00C46C"}}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-xs text-slate-400 text-center mb-3">Quick Demo (password: demo@123)</div>
            <div className="grid grid-cols-4 gap-1.5">
              {DEMO_USERS.map(u => (
                <button key={u.email} onClick={() => demoLogin(u.email)} disabled={loading}
                  className={`text-[10px] px-2 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80 disabled:opacity-40 ${u.color}`}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}