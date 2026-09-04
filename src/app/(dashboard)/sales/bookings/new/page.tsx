"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared";
import { ChevronRight, ChevronLeft, Info, Users } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Fallback trip names (used only if the Trip Master API has no data yet, e.g. before seeding).
// Once /api/trip-master returns rows, those are used instead — including their basePrice.
const FALLBACK_TRIP_MASTER: Record<string, string[]> = {
  Weekend: ["Gokarna Dandeli","Gokarna Jogfalls","Coorg Chikmaglur","Ooty Coonoor","Wayanad","Pondicherry","Araku Vizag","Lonavala"],
  Backpacking: ["Kerala","Ooty Kodaikanal","Goa","Manali","Gangtok Darjeeling","Rajasthan","Kashmir","Andaman"],
  Temple: ["Kedarnath","Do Dham","Chardham","Temples of Tamilnadu","Temples of Karnataka","Shirdi","Puri and Bhubaneshwar"],
  Custom: [],
};

interface TripMasterRow { id: string; name: string; destination: string; category: string; basePrice?: number | null; defaultDays?: number | null; }
const ACCOMMODATION = ["Twin Sharing","Triple or Quad Sharing","Tent Sharing","Solo Sharing"];
const TICKET_TYPES = ["Own","SPL","Regular"];
const TRAVEL_CLASSES = ["Sleeper","3A","2A","1A","Flight","Bus"];
const LEAD_ORIGINS = ["Instagram","Website","Guide Referral","Previous Customers","Organic Followers","Facebook","WhatsApp","Walk-in","Other"];
const PAYMENT_ACCOUNTS = ["Swadeshi - HDFC","Swadeshi - SBI","Swadeshi - ICICI","Swadeshi - Axis","Swadeshi - GPay","Swadeshi - PhonePe"];
const STANDARD_ORIGINS = ["HYD","BZA","BLR","Hyderabad","Vijayawada","Bengaluru","Bangalore"];
const STEPS = ["Customer Info","Trip Details","Transportation","Pricing","Payment","Review"];

const inputCls = "w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] bg-white";
const labelCls = "block text-xs font-medium text-slate-600 mb-1";

type FormState = Record<string, string | boolean>;

// Hoisted OUTSIDE the page component on purpose: defining this inline inside
// NewBookingPage previously caused it to be re-created as a brand-new component
// type on every render, which made React unmount/remount the underlying <input>
// DOM node after every keystroke (losing focus, so only one character registered
// at a time before you had to click back into the field). Keeping it here fixes that.
function F({ label, name, type = "text", placeholder = "", required = false, f, set, children }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
  f: FormState; set: (k: string, v: string | boolean) => void; children?: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children ?? (
        <input
          type={type}
          value={(f[name] as string) ?? ""}
          onChange={(e) => set(name, e.target.value)}
          className={inputCls}
          placeholder={placeholder}
          required={required}
          name={name}
        />
      )}
    </div>
  );
}

interface PassengerForm { name: string; age: string; gender: string; phone: string; }

export default function NewBookingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [tripMasters, setTripMasters] = useState<TripMasterRow[]>([]);
  const [baseCostManual, setBaseCostManual] = useState(false);
  const [passengers, setPassengers] = useState<PassengerForm[]>([{ name: "", age: "", gender: "", phone: "" }]);

  useEffect(() => {
    fetch("/api/trip-master").then(r => r.json()).then(j => setTripMasters(j.data ?? [])).catch(() => {});
  }, []);

  const TRIP_MASTER: Record<string, string[]> = useMemo(() => {
    const grouped: Record<string, string[]> = { Weekend: [], Backpacking: [], Temple: [], Custom: [] };
    for (const t of tripMasters) {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t.name);
    }
    for (const cat of Object.keys(FALLBACK_TRIP_MASTER)) {
      if (!grouped[cat] || grouped[cat].length === 0) grouped[cat] = FALLBACK_TRIP_MASTER[cat];
    }
    return grouped;
  }, [tripMasters]);

  const [f, setF] = useState({
    customerName:"",phoneNumber:"",whatsapp:"",email:"",city:"",
    tripType:"Weekend",natureOfTrip:"GroupDeparture",tripName:"",customTripName:"",
    accommodationType:"Twin Sharing",journeyDate:"",returnDate:"",paxCount:"1",
    onwardTicketType:"Regular",onwardClass:"Sleeper",onwardFrom:"Hyderabad",
    returnTicketType:"Regular",returnClass:"Sleeper",returnTo:"Hyderabad",hasReturn:false,
    onwardDifference:"0",onwardDiffDesc:"",returnDifference:"0",returnDiffDesc:"",
    basePackageCost:"0",discountType:"Fixed",discountValue:"0",discountReason:"",
    additionalCharges:"0",additionalChargesDesc:"",
    ticketAdvanceAmount:"0",actualTicketCost:"0",
    advancePaid:"0",paymentMethod:"UPI",utrNumber:"",accountName:"Swadeshi - HDFC",
    gstType:"NonGST",leadOrigin:"WhatsApp",salesPersonName:"",notes:"",
  });

  function set(k: string, v: string | boolean) { setF((p) => ({ ...p, [k]: v })); }

  const paxCount = Math.max(1, Number(f.paxCount) || 1);
  const selectedTripName = f.natureOfTrip === "PrivateDeparture" ? f.customTripName : f.tripName;
  const selectedTrip = tripMasters.find((t) => t.name === selectedTripName);
  const perPaxBasePrice = selectedTrip?.basePrice ?? null;

  // Auto-calculate Base Package Cost = pax count x trip's per-pax base price, whenever
  // the trip or the number of people changes — unless the person has typed a custom
  // amount into Base Package Cost themselves (baseCostManual).
  useEffect(() => {
    if (!baseCostManual && perPaxBasePrice != null) {
      set("basePackageCost", String(perPaxBasePrice * paxCount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPaxBasePrice, paxCount, baseCostManual]);

  // Keep the passenger detail rows in sync with "Number of People".
  useEffect(() => {
    setPassengers((prev) => {
      if (prev.length === paxCount) return prev;
      if (prev.length < paxCount) {
        return [...prev, ...Array.from({ length: paxCount - prev.length }, () => ({ name: "", age: "", gender: "", phone: "" }))];
      }
      return prev.slice(0, paxCount);
    });
  }, [paxCount]);

  function setPassenger(i: number, k: keyof PassengerForm, v: string) {
    setPassengers((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  }

  const base = Number(f.basePackageCost)||0;
  const onwardDiff = Number(f.onwardDifference)||0;
  const returnDiff = Number(f.hasReturn ? f.returnDifference : 0)||0;
  const discountAmt = f.discountType === "Percentage"
    ? Math.round(base * (Number(f.discountValue)||0) / 100)
    : Number(f.discountValue)||0;
  const additional = Number(f.additionalCharges)||0;
  const finalCost = base + onwardDiff + returnDiff - discountAmt + additional;
  const advance = Number(f.advancePaid)||0;
  const balance = Math.max(0, finalCost - advance);

  const needsOnwardDiff = f.onwardFrom && !STANDARD_ORIGINS.some(s => f.onwardFrom.toLowerCase().includes(s.toLowerCase()));
  const needsReturnDiff = f.hasReturn && f.returnTo && !STANDARD_ORIGINS.some(s => f.returnTo.toLowerCase().includes(s.toLowerCase()));
  const ticketBalance = (Number(f.ticketAdvanceAmount)||0) - (Number(f.actualTicketCost)||0);
  const requiresUTR = ["UPI","NEFT","RTGS","IMPS","Bank Transfer"].includes(f.paymentMethod);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requiresUTR && !f.utrNumber) { toast.error("UTR number is mandatory for " + f.paymentMethod); return; }
    const tripName = f.natureOfTrip === "PrivateDeparture" ? f.customTripName : f.tripName;
    if (!tripName) { toast.error("Please select or enter a trip name"); return; }
    const namedPassengers = passengers.filter((p) => p.name.trim());
    if (namedPassengers.length === 0) { toast.error("Add at least one passenger's name"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: f.customerName, phoneNumber: f.phoneNumber,
          whatsapp: f.whatsapp || f.phoneNumber, email: f.email || null, city: f.city,
          tripType: f.tripType, tripName, tripMasterId: selectedTrip?.id || null, natureOfTrip: f.natureOfTrip,
          journeyDate: f.journeyDate, returnDate: f.returnDate || null,
          paxCount: Number(f.paxCount)||1, accommodationType: f.accommodationType,
          onwardTicketType: f.onwardTicketType, onwardClass: f.onwardClass, onwardFrom: f.onwardFrom,
          returnTicketType: f.hasReturn ? f.returnTicketType : null,
          returnClass: f.hasReturn ? f.returnClass : null, returnTo: f.hasReturn ? f.returnTo : null,
          onwardDifference: onwardDiff, onwardDiffDesc: needsOnwardDiff ? f.onwardDiffDesc : null, onwardDiffRequired: needsOnwardDiff,
          returnDifference: returnDiff, returnDiffDesc: needsReturnDiff ? f.returnDiffDesc : null, returnDiffRequired: needsReturnDiff,
          basePackageCost: base, baseCostManual, discountType: f.discountType, discountValue: Number(f.discountValue)||0,
          discountAmount: discountAmt, discountReason: f.discountReason || null,
          additionalCharges: additional, additionalChargesDesc: f.additionalChargesDesc || null,
          finalPackageCost: finalCost,
          ticketAdvanceAmount: Number(f.ticketAdvanceAmount)||0, actualTicketCost: Number(f.actualTicketCost)||0,
          advancePaid: advance, paymentMethod: f.paymentMethod, utrNumber: f.utrNumber || null,
          accountName: f.accountName, gstType: f.gstType,
          leadOrigin: f.leadOrigin, salesPersonName: f.salesPersonName || session?.user?.name,
          notes: f.notes || null,
          passengers: namedPassengers.map((p) => ({
            name: p.name, age: p.age ? Number(p.age) : null, gender: p.gender || null, phone: p.phone || null,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(`Booking ${json.data.bookingCode} created!`);
      router.push(`/sales/bookings/${json.data.id}`);
    } catch { toast.error("Failed to create booking"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="New Booking" subtitle="Complete all steps to create a booking" breadcrumb="Sales / Bookings"/>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => i < step && setStep(i)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                step === i ? "bg-[#0F4C81] text-white" : i < step ? "bg-emerald-100 text-emerald-700 cursor-pointer" : "bg-white border border-[#E2E8F0] text-slate-400 cursor-not-allowed")}>
              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", step === i ? "bg-white/25 text-white" : i < step ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-400")}>
                {i < step ? "✓" : i+1}
              </span>
              {s}
            </button>
            {i < STEPS.length-1 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0"/>}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">

          {/* STEP 0: CUSTOMER */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Customer Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <F f={f} set={set} label="Customer Name" name="customerName" placeholder="Rajesh Kumar" required/>
                <F f={f} set={set} label="Phone Number" name="phoneNumber" placeholder="+91 98765 43210" required/>
                <F f={f} set={set} label="WhatsApp Number" name="whatsapp" placeholder="Same as phone"/>
                <F f={f} set={set} label="Email" name="email" type="email" placeholder="customer@email.com"/>
                <F f={f} set={set} label="City" name="city" placeholder="Mumbai, Pune, Hyderabad..." required/>
              </div>
            </div>
          )}

          {/* STEP 1: TRIP */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Trip Details</h2>
              <div>
                <label className={labelCls}>Trip Category <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(TRIP_MASTER).map((cat) => (
                    <button type="button" key={cat} onClick={() => { set("tripType", cat); set("tripName", ""); }}
                      className={cn("py-2.5 px-3 rounded-xl border text-sm font-medium transition-all",
                        f.tripType === cat ? "bg-[#0F4C81] text-white border-[#0F4C81]" : "bg-white border-[#E2E8F0] text-slate-600 hover:border-[#0F4C81]/40")}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Nature of Trip <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {[["GroupDeparture","👥 Group Departure","Select from predefined trips"],["PrivateDeparture","🚀 Private Departure","Custom trip with own itinerary"]].map(([val,label,desc]) => (
                    <button type="button" key={val} onClick={() => set("natureOfTrip", val)}
                      className={cn("py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all text-left",
                        f.natureOfTrip === val ? "border-[#0F4C81] bg-blue-50 text-[#0F4C81]" : "border-[#E2E8F0] text-slate-600")}>
                      {label}<div className="text-xs font-normal text-slate-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              {f.natureOfTrip === "GroupDeparture" && (
                <div>
                  <label className={labelCls}>Select Trip <span className="text-red-500">*</span></label>
                  {f.tripType === "Custom"
                    ? <input value={f.tripName} onChange={(e) => set("tripName", e.target.value)} className={inputCls} placeholder="Enter custom trip name"/>
                    : <select value={f.tripName} onChange={(e) => set("tripName", e.target.value)} className={inputCls}>
                        <option value="">— Select {f.tripType} trip —</option>
                        {(TRIP_MASTER[f.tripType] ?? []).map((t) => <option key={t}>{t}</option>)}
                      </select>
                  }
                </div>
              )}
              {f.natureOfTrip === "PrivateDeparture" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-amber-800">Private Trip</div>
                  <div>
                    <label className={labelCls}>Trip Name <span className="text-red-500">*</span></label>
                    <input value={f.customTripName} onChange={(e) => set("customTripName", e.target.value)} className={inputCls} placeholder="Rajesh Family Kerala Trip"/>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <F f={f} set={set} label="Number of People" name="paxCount" type="number" placeholder="4" required/>
                  {perPaxBasePrice != null && (
                    <p className="text-xs text-emerald-600 mt-1">Base price: {formatCurrency(perPaxBasePrice)} / person → package auto-fills as {paxCount} × {formatCurrency(perPaxBasePrice)}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Accommodation Type</label>
                  <select value={f.accommodationType} onChange={(e) => set("accommodationType", e.target.value)} className={inputCls}>
                    {ACCOMMODATION.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <F f={f} set={set} label="Journey Date" name="journeyDate" type="date" required/>
                <F f={f} set={set} label="Return Date" name="returnDate" type="date"/>
              </div>

              <div className="border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C81] uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5"/> Passenger Details ({passengers.length})
                </div>
                <p className="text-xs text-slate-400 -mt-2">These pax show up on Calendar and let Ticket Admin confirm and allocate tickets per person.</p>
                <div className="space-y-2">
                  {passengers.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1 w-6 h-6 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] font-bold text-xs flex items-center justify-center">{i+1}</div>
                      <input value={p.name} onChange={(e) => setPassenger(i, "name", e.target.value)} className={cn(inputCls, "col-span-4")} placeholder={`Passenger ${i+1} name${i===0?" *":""}`} required={i===0}/>
                      <input value={p.age} onChange={(e) => setPassenger(i, "age", e.target.value)} type="number" className={cn(inputCls, "col-span-2")} placeholder="Age"/>
                      <select value={p.gender} onChange={(e) => setPassenger(i, "gender", e.target.value)} className={cn(inputCls, "col-span-2")}>
                        <option value="">Gender</option><option value="M">M</option><option value="F">F</option><option value="Other">Other</option>
                      </select>
                      <input value={p.phone} onChange={(e) => setPassenger(i, "phone", e.target.value)} className={cn(inputCls, "col-span-3")} placeholder="Phone (optional)"/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TRANSPORT */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Transportation</h2>
              <div className="border border-[#E2E8F0] rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Onward Journey</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={labelCls}>Ticket Type</label><select value={f.onwardTicketType} onChange={(e) => set("onwardTicketType",e.target.value)} className={inputCls}>{TICKET_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label className={labelCls}>Travel Class</label><select value={f.onwardClass} onChange={(e) => set("onwardClass",e.target.value)} className={inputCls}>{TRAVEL_CLASSES.map(c=><option key={c}>{c}</option>)}</select></div>
                  <F f={f} set={set} label="Boarding Point" name="onwardFrom" placeholder="Hyderabad, Pune..."/>
                </div>
                {needsOnwardDiff && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <div className="text-xs font-semibold text-amber-800 flex items-center gap-1"><Info className="w-3.5 h-3.5"/> Onward Difference (non-standard origin)</div>
                    <div className="grid grid-cols-2 gap-3">
                      <F f={f} set={set} label="Difference Amount (₹)" name="onwardDifference" type="number" placeholder="2000"/>
                      <F f={f} set={set} label="Description" name="onwardDiffDesc" placeholder="Cost from Nanded to Pune departure"/>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set("hasReturn", !f.hasReturn)}
                  className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", f.hasReturn ? "bg-[#0F4C81]" : "bg-slate-200")}>
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", f.hasReturn ? "translate-x-6" : "translate-x-1")}/>
                </button>
                <span className="text-sm font-medium text-slate-700">Include Return Journey</span>
              </div>
              {f.hasReturn && (
                <div className="border border-[#E2E8F0] rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Return Journey</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className={labelCls}>Ticket Type</label><select value={f.returnTicketType} onChange={(e) => set("returnTicketType",e.target.value)} className={inputCls}>{TICKET_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className={labelCls}>Travel Class</label><select value={f.returnClass} onChange={(e) => set("returnClass",e.target.value)} className={inputCls}>{TRAVEL_CLASSES.map(c=><option key={c}>{c}</option>)}</select></div>
                    <F f={f} set={set} label="Dropping Point" name="returnTo" placeholder="Hyderabad, Pune..."/>
                  </div>
                  {needsReturnDiff && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <div className="text-xs font-semibold text-amber-800 flex items-center gap-1"><Info className="w-3.5 h-3.5"/> Return Difference</div>
                      <div className="grid grid-cols-2 gap-3">
                        <F f={f} set={set} label="Difference Amount (₹)" name="returnDifference" type="number" placeholder="2000"/>
                        <F f={f} set={set} label="Description" name="returnDiffDesc" placeholder="Cost from Pune to Nanded"/>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PRICING */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Pricing (Transparent Calculation)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Base Package Cost (₹) <span className="text-red-500">*</span></label>
                  <input type="number" value={f.basePackageCost} onChange={(e) => { set("basePackageCost", e.target.value); setBaseCostManual(true); }} className={inputCls} placeholder="40000" required/>
                  {perPaxBasePrice != null && (
                    baseCostManual ? (
                      <button type="button" onClick={() => { setBaseCostManual(false); set("basePackageCost", String(perPaxBasePrice * paxCount)); }} className="text-xs text-[#0F4C81] hover:underline mt-1">
                        Reset to auto ({paxCount} × {formatCurrency(perPaxBasePrice)})
                      </button>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">Auto: {paxCount} pax × {formatCurrency(perPaxBasePrice)} base price</p>
                    )
                  )}
                </div>
                <F f={f} set={set} label="Onward Difference (₹)" name="onwardDifference" type="number" placeholder="0"/>
                {f.hasReturn && <F f={f} set={set} label="Return Difference (₹)" name="returnDifference" type="number" placeholder="0"/>}
              </div>
              <div className="border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-[#0F4C81] uppercase tracking-wide">Discount</div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelCls}>Discount Type</label><select value={f.discountType} onChange={(e) => set("discountType",e.target.value)} className={inputCls}><option value="Fixed">Fixed Amount</option><option value="Percentage">Percentage %</option></select></div>
                  <F f={f} set={set} label={f.discountType==="Percentage"?"Discount %":"Discount Amount (₹)"} name="discountValue" type="number" placeholder={f.discountType==="Percentage"?"5":"2000"}/>
                  <div><label className={labelCls}>Calculated Discount</label><div className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-600 font-semibold">{formatCurrency(discountAmt)}</div></div>
                </div>
                <F f={f} set={set} label="Discount Reason" name="discountReason" placeholder="Returning customer, Group discount..."/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F f={f} set={set} label="Additional Charges (₹)" name="additionalCharges" type="number" placeholder="0"/>
                <F f={f} set={set} label="Additional Charges Description" name="additionalChargesDesc" placeholder="Tatkal charge, extra transport..."/>
              </div>
              <div className="border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ticket Advance Tracking</div>
                <div className="grid grid-cols-3 gap-3">
                  <F f={f} set={set} label="Ticket Advance Amount (₹)" name="ticketAdvanceAmount" type="number" placeholder="5000"/>
                  <F f={f} set={set} label="Actual Ticket Cost (₹)" name="actualTicketCost" type="number" placeholder="3800"/>
                  <div><label className={labelCls}>Ticket Balance</label><div className={cn("w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm font-semibold", ticketBalance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>{formatCurrency(ticketBalance)}</div></div>
                </div>
              </div>
              <div className="bg-[#0F4C81]/5 border border-[#0F4C81]/20 rounded-2xl p-4">
                <div className="text-xs font-bold text-[#0F4C81] uppercase tracking-wide mb-3">Final Calculation</div>
                <div className="space-y-1.5 text-sm">
                  {[
                    ["Base Package", formatCurrency(base), "text-slate-900"],
                    ["+ Onward Difference", formatCurrency(onwardDiff), "text-amber-600"],
                    ...(f.hasReturn ? [["+ Return Difference", formatCurrency(returnDiff), "text-amber-600"]] : []),
                    ...(discountAmt > 0 ? [["− Discount", formatCurrency(discountAmt), "text-red-500"]] : []),
                    ...(additional > 0 ? [["+ Additional Charges", formatCurrency(additional), "text-amber-600"]] : []),
                  ].map(([label, value, color]) => (
                    <div key={label as string} className="flex justify-between"><span className="text-slate-500">{label}</span><span className={cn("font-medium", color as string)}>{value}</span></div>
                  ))}
                  <div className="border-t border-[#0F4C81]/20 pt-2 flex justify-between font-bold text-base"><span className="text-slate-900">= Final Package Cost</span><span className="text-[#0F4C81]">{formatCurrency(finalCost)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Payment Information</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0"/>
                Payment entered here is pending Finance approval. Sales cannot approve payments.
              </div>

              {/* Trip Payment Summary — pulled automatically from the selected Trip Master/Trip,
                  so Sales never has to re-type the trip name or base price here. */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Trip Payment Summary</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">{selectedTripName || "—"}</span>
                  {perPaxBasePrice != null && <span className="text-slate-500 text-xs">{formatCurrency(perPaxBasePrice)} / person</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>{paxCount} {paxCount === 1 ? "person" : "people"}</span>
                  <span>Base Package: <span className="font-semibold text-slate-700">{formatCurrency(base)}</span></span>
                </div>
                <div className="border-t border-slate-200 mt-3 pt-2 space-y-1 text-xs">
                  {onwardDiff !== 0 && <div className="flex justify-between text-slate-500"><span>Onward Difference</span><span>{formatCurrency(onwardDiff)}</span></div>}
                  {f.hasReturn && returnDiff !== 0 && <div className="flex justify-between text-slate-500"><span>Return Difference</span><span>{formatCurrency(returnDiff)}</span></div>}
                  {discountAmt > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>−{formatCurrency(discountAmt)}</span></div>}
                  {additional > 0 && <div className="flex justify-between text-slate-500"><span>Additional Charges</span><span>{formatCurrency(additional)}</span></div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Final Package Cost</label><div className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm bg-blue-50 text-[#0F4C81] font-bold text-base">{formatCurrency(finalCost)}</div></div>
                <F f={f} set={set} label="Advance Paid (₹)" name="advancePaid" type="number" placeholder="10000"/>
                <div><label className={labelCls}>Balance Due</label><div className={cn("w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm font-bold", balance > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>{formatCurrency(balance)}</div></div>
                <div><label className={labelCls}>Payment Method</label><select value={f.paymentMethod} onChange={(e) => set("paymentMethod",e.target.value)} className={inputCls}>{["Cash","UPI","NEFT","RTGS","IMPS","Card","Cheque"].map(m=><option key={m}>{m}</option>)}</select></div>
                <div>
                  <label className={labelCls}>UTR / Transaction Number {requiresUTR && <span className="text-red-500">*</span>}</label>
                  <input value={f.utrNumber} onChange={(e) => set("utrNumber",e.target.value)} className={inputCls} placeholder="UTR number" required={requiresUTR}/>
                  {requiresUTR && <p className="text-xs text-amber-600 mt-1">Mandatory for {f.paymentMethod}</p>}
                </div>
                <div><label className={labelCls}>Payment Account</label><select value={f.accountName} onChange={(e) => set("accountName",e.target.value)} className={inputCls}>{PAYMENT_ACCOUNTS.map(a=><option key={a}>{a}</option>)}</select></div>
                <div><label className={labelCls}>GST Type</label><select value={f.gstType} onChange={(e) => set("gstType",e.target.value)} className={inputCls}><option value="NonGST">Non-GST</option><option value="GST">GST</option></select></div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Review & Create Booking</h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Customer",f.customerName],["Phone",f.phoneNumber],["City",f.city],
                  ["Trip",f.natureOfTrip==="PrivateDeparture"?f.customTripName:f.tripName],
                  ["Category",f.tripType],["Nature",f.natureOfTrip.replace("Departure"," Departure")],
                  ["Pax Count",f.paxCount],["Journey Date",f.journeyDate],
                  ["Accommodation",f.accommodationType],
                  ["Base Package",formatCurrency(base)],
                  ...(discountAmt>0?[["Discount",formatCurrency(discountAmt)]]:[] as string[][]),
                  ["Final Package",formatCurrency(finalCost)],
                  ["Advance Paid",formatCurrency(advance)],
                  ["Balance Due",formatCurrency(balance)],
                  ["Payment Method",f.paymentMethod],
                  ...(f.utrNumber?[["UTR",f.utrNumber]]:[] as string[][]),
                  ["Lead Origin",f.leadOrigin],
                ].map(([l,v]) => (
                  <div key={l as string} className="flex gap-2 bg-slate-50 rounded-lg p-2.5">
                    <span className="text-slate-400 w-24 flex-shrink-0">{l}:</span>
                    <span className="font-medium text-slate-900 truncate">{v||"—"}</span>
                  </div>
                ))}
              </div>
              <div className="border border-[#E2E8F0] rounded-2xl p-4">
                <div className="text-xs font-bold text-[#0F4C81] uppercase tracking-wide mb-2">Passengers ({passengers.filter(p=>p.name.trim()).length})</div>
                <div className="space-y-1">
                  {passengers.filter(p=>p.name.trim()).map((p,i) => (
                    <div key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-slate-400">{i+1}.</span><span className="font-medium">{p.name}</span>
                      {p.age && <span className="text-xs text-slate-400">{p.age}y</span>}{p.gender && <span className="text-xs text-slate-400">{p.gender}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Lead Origin</label><select value={f.leadOrigin} onChange={(e) => set("leadOrigin",e.target.value)} className={inputCls}>{LEAD_ORIGINS.map(l=><option key={l}>{l}</option>)}</select></div>
                <F f={f} set={set} label="Sales Person" name="salesPersonName" placeholder={session?.user?.name ?? "Your name"}/>
              </div>
              <div><label className={labelCls}>Notes</label><textarea value={f.notes} onChange={(e) => set("notes",e.target.value)} rows={2} className={cn(inputCls,"resize-none")} placeholder="Internal notes..."/></div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button type="button" disabled={step===0} onClick={() => setStep(s=>Math.max(0,s-1))} className="btn-secondary disabled:opacity-40">
            <ChevronLeft className="w-4 h-4"/> Previous
          </button>
          {step < STEPS.length-1 ? (
            <button type="button" onClick={() => setStep(s=>s+1)} className="btn-primary">
              Next: {STEPS[step+1]} <ChevronRight className="w-4 h-4"/>
            </button>
          ) : (
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Creating...</> : "✓ Create Booking"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}