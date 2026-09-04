"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, IndianRupee, Ticket, Users, Calendar } from "lucide-react";
import { Card, SectionHeader, Modal } from "@/components/shared";
import { formatCurrency, formatDate, cn, PAYMENT_STATUS_COLOR, BOOKING_STATUS_COLOR } from "@/lib/utils";
import { toast } from "sonner";

interface BookingDetail {
  id: string; bookingCode: string; customerName: string; phoneNumber: string; city?: string;
  tripType: string; tripName: string; natureOfTrip: string; journeyDate: string; returnDate?: string;
  paxCount: number; accommodationType?: string;
  onwardTicketType?: string; onwardClass?: string; onwardFrom?: string;
  returnTicketType?: string; returnClass?: string; returnTo?: string;
  basePackageCost: number; onwardDifference: number; onwardDiffDesc?: string;
  returnDifference: number; returnDiffDesc?: string;
  discountAmount: number; discountReason?: string; discountApprovalStatus: string;
  additionalCharges: number; finalPackageCost: number;
  ticketAdvanceAmount: number; actualTicketCost: number; ticketAdvanceBalance: number;
  advancePaid: number; totalPaid: number; balanceDue: number; refundAmount: number;
  paymentStatus: string; gstType: string; leadOrigin: string; salesPersonName?: string;
  status: string; operationalStatus: string; notes?: string;
  cancelReason?: string; transferredFrom?: string;
  createdAt: string; updatedAt: string;
  customer: { customerId: string; totalBookings: number };
  passengers: Array<{ id: string; name: string; age?: number; gender?: string; phone?: string; ticketStatus: string; seatNumber?: string; pnrNumber?: string }>;
  payments: Array<{ id: string; paymentCode: string; amount: number; paymentMethod: string; utrNumber?: string; approvalStatus: string; enteredBy?: string; approvedBy?: string; rejectionReason?: string; createdAt: string }>;
  ticketAllocations: Array<{ id: string; seatNumber?: string; pnrNumber?: string; status: string; ticket: { fromLocation: string; toLocation: string; travelDate: string; coachClass?: string }; passenger?: { name: string } }>;
  issues: Array<{ id: string; concern: string; status: string; createdAt: string }>;
  refunds: Array<{ id: string; reason: string; amount: number; status: string; createdAt: string }>;
}

const PAYMENT_STATUS_LABEL: Record<string,string> = { Pending:"⏳ Pending", Submitted:"📤 Submitted", UnderReview:"🔍 Under Review", Approved:"✅ Approved", Rejected:"❌ Rejected", Processed:"✓ Processed" };

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "UPI", utrNumber: "", notes: "" });
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => { fetchBooking(); }, [id]);

  async function fetchBooking() {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const json = await res.json();
      setBooking(json.data);
    } catch { toast.error("Failed to load booking"); }
    finally { setLoading(false); }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    const requiresUTR = ["UPI","NEFT","RTGS","IMPS","Bank Transfer"].includes(payForm.paymentMethod);
    if (requiresUTR && !payForm.utrNumber) { toast.error("UTR is mandatory for " + payForm.paymentMethod); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, ...payForm, amount: Number(payForm.amount) }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Payment submitted — pending Finance approval");
      setPayModal(false); setPayForm({ amount: "", paymentMethod: "UPI", utrNumber: "", notes: "" });
      fetchBooking();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function cancelBooking() {
    if (!cancelReason.trim()) { toast.error("Cancellation reason is mandatory"); return; }
    setSaving(true);
    try {
      await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", reason: cancelReason }) });
      toast.success("Booking cancelled");
      setCancelModal(false); fetchBooking();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>;
  if (!booking) return <div className="text-center py-16 text-slate-400">Booking not found</div>;

  const b = booking;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><ArrowLeft className="w-4 h-4"/></button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-display font-bold text-slate-900">{b.tripName}</h1>
            <span className={cn("badge text-xs", BOOKING_STATUS_COLOR[b.status])}>{b.status}</span>
            <span className={cn("badge text-xs", PAYMENT_STATUS_COLOR[b.paymentStatus])}>{b.paymentStatus}</span>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[#0F4C81] font-bold">{b.bookingCode}</span>
            <span>·</span><span>{b.customerName}</span>
            <span>·</span><span className="font-mono text-xs">{b.customer.customerId}</span>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {b.status !== "Cancelled" && (
            <>
              <button onClick={() => setPayModal(true)} className="btn-primary text-xs py-2"><IndianRupee className="w-3.5 h-3.5"/> Record Payment</button>
              <button onClick={() => setCancelModal(true)} className="btn-secondary text-xs py-2 text-red-600 border-red-200 hover:bg-red-50">Cancel Booking</button>
            </>
          )}
        </div>
      </div>

      {/* Cancelled notice */}
      {b.status === "Cancelled" && b.cancelReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <XCircle className="w-4 h-4 flex-shrink-0"/>
          <span><strong>Cancelled:</strong> {b.cancelReason}</span>
        </div>
      )}

      {/* Booking Summary Card */}
      <Card>
        <SectionHeader title="Booking Summary"/>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Customer</div>
            {[["Name", b.customerName],["Phone", b.phoneNumber],["City", b.city ?? "—"],["Lead Origin", b.leadOrigin],["Sales Person", b.salesPersonName ?? "—"]].map(([l,v]) => (
              <div key={l}><div className="text-xs text-slate-400">{l}</div><div className="text-sm font-medium text-slate-900">{v}</div></div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Trip</div>
            {[["Trip Name", b.tripName],["Category", b.tripType],["Nature", b.natureOfTrip.replace("Departure"," Departure")],["Journey", formatDate(b.journeyDate)],["Return", b.returnDate ? formatDate(b.returnDate) : "—"],["Pax Count", b.paxCount],["Accommodation", b.accommodationType ?? "—"]].map(([l,v]) => (
              <div key={l}><div className="text-xs text-slate-400">{l}</div><div className="text-sm font-medium text-slate-900">{v}</div></div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Transportation</div>
            {[["Onward Type", b.onwardTicketType ?? "—"],["Onward Class", b.onwardClass ?? "—"],["Boarding Point", b.onwardFrom ?? "—"],["Return Type", b.returnTicketType ?? "—"],["Return Class", b.returnClass ?? "—"],["Dropping Point", b.returnTo ?? "—"]].map(([l,v]) => (
              <div key={l}><div className="text-xs text-slate-400">{l}</div><div className="text-sm font-medium text-slate-900">{v}</div></div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Financial Breakdown</div>
            {[
              ["Base Package", formatCurrency(b.basePackageCost), "text-slate-900"],
              ...(b.onwardDifference > 0 ? [["+ Onward Diff", formatCurrency(b.onwardDifference), "text-amber-600", b.onwardDiffDesc]] : []),
              ...(b.returnDifference > 0 ? [["+ Return Diff", formatCurrency(b.returnDifference), "text-amber-600", b.returnDiffDesc]] : []),
              ...(b.discountAmount > 0 ? [["− Discount", formatCurrency(b.discountAmount), "text-red-500", b.discountReason]] : []),
              ...(b.additionalCharges > 0 ? [["+ Additional", formatCurrency(b.additionalCharges), "text-amber-600"]] : []),
            ].map(([l,v,c,desc]) => (
              <div key={l as string}><div className="flex justify-between text-xs"><span className="text-slate-500">{l as string}</span><span className={cn("font-medium", c as string)}>{v as string}</span></div>{desc && <div className="text-[10px] text-slate-400 ml-2">{desc}</div>}</div>
            ))}
            <div className="border-t border-[#E2E8F0] pt-1.5 mt-1.5">
              <div className="flex justify-between text-sm font-bold"><span className="text-slate-900">Final Package</span><span className="text-[#0F4C81]">{formatCurrency(b.finalPackageCost)}</span></div>
              <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">Advance Paid</span><span className="text-emerald-600 font-medium">{formatCurrency(b.totalPaid)}</span></div>
              <div className="flex justify-between text-xs mt-0.5"><span className="text-slate-500">Balance Due</span><span className={cn("font-bold", b.balanceDue > 0 ? "text-red-500" : "text-emerald-600")}>{formatCurrency(b.balanceDue)}</span></div>
              {b.discountAmount > 0 && <div className={cn("text-xs mt-0.5", b.discountApprovalStatus === "Approved" ? "text-emerald-600" : "text-amber-600")}>Discount: {b.discountApprovalStatus}</div>}
            </div>
            {b.ticketAdvanceAmount > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mt-2">
                <div className="text-xs font-semibold text-blue-700 mb-1">Ticket Advance Balance</div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Advance</span><span>{formatCurrency(b.ticketAdvanceAmount)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Actual Cost</span><span>{formatCurrency(b.actualTicketCost)}</span></div>
                <div className="flex justify-between text-xs font-bold border-t border-blue-100 mt-1 pt-1"><span>Balance</span><span className={b.ticketAdvanceBalance >= 0 ? "text-emerald-600" : "text-red-500"}>{formatCurrency(b.ticketAdvanceBalance)}</span></div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payments */}
        <Card noPad>
          <div className="p-5 pb-0"><SectionHeader title={`Payments (${b.payments.length})`}/></div>
          {b.payments.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">No payments recorded</p> :
          <div className="divide-y divide-slate-50">
            {b.payments.map(p => (
              <div key={p.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs font-bold text-[#0F4C81]">{p.paymentCode}</div>
                    <div className="text-sm font-semibold text-slate-900">{formatCurrency(p.amount)}</div>
                    <div className="text-xs text-slate-400">{p.paymentMethod} {p.utrNumber ? `· UTR: ${p.utrNumber}` : ""}</div>
                    <div className="text-xs text-slate-400">By: {p.enteredBy}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold">{PAYMENT_STATUS_LABEL[p.approvalStatus] ?? p.approvalStatus}</div>
                    {p.approvedBy && <div className="text-xs text-emerald-600">✓ {p.approvedBy}</div>}
                    {p.rejectionReason && <div className="text-xs text-red-500 max-w-[120px]">{p.rejectionReason}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>}
        </Card>

        {/* Passengers */}
        <Card noPad>
          <div className="p-5 pb-0"><SectionHeader title={`Passengers (${b.passengers.length})`}/></div>
          {b.passengers.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">No passengers</p> :
          <div className="divide-y divide-slate-50">
            {b.passengers.map((p, i) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] font-bold text-xs flex items-center justify-center flex-shrink-0">{i+1}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-400 flex gap-2">{p.age && <span>{p.age}y</span>}{p.gender && <span>{p.gender}</span>}{p.phone && <span>{p.phone}</span>}</div>
                  {p.pnrNumber && <div className="font-mono text-xs text-[#0F4C81]">PNR: {p.pnrNumber} {p.seatNumber ? `· Seat: ${p.seatNumber}` : ""}</div>}
                </div>
                <span className={cn("badge text-xs", p.ticketStatus === "Allocated" ? "bg-emerald-100 text-emerald-700" : p.ticketStatus === "Confirmed" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>{p.ticketStatus}</span>
              </div>
            ))}
          </div>}
        </Card>
      </div>

      {/* Ticket Allocations */}
      {b.ticketAllocations.length > 0 && (
        <Card noPad>
          <div className="p-5 pb-0"><SectionHeader title="Ticket Allocations"/></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{["Route","Travel Date","Class","Passenger","Seat","PNR","Status"].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {b.ticketAllocations.map(a => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="td font-medium text-sm">{a.ticket.fromLocation} → {a.ticket.toLocation}</td>
                    <td className="td text-sm">{formatDate(a.ticket.travelDate)}</td>
                    <td className="td text-xs text-slate-500">{a.ticket.coachClass ?? "—"}</td>
                    <td className="td text-sm">{a.passenger?.name ?? "—"}</td>
                    <td className="td font-mono text-xs">{a.seatNumber ?? "—"}</td>
                    <td className="td font-mono text-xs">{a.pnrNumber ?? "—"}</td>
                    <td className="td"><span className="badge text-xs bg-emerald-100 text-emerald-700">{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Issues & Refunds */}
      {(b.issues.length > 0 || b.refunds.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {b.issues.length > 0 && (
            <Card><SectionHeader title="Customer Issues"/>
              {b.issues.map(i => (
                <div key={i.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="text-sm text-slate-700 flex-1 pr-3">{i.concern}</div>
                  <span className={cn("badge text-xs flex-shrink-0", i.status==="Open"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700")}>{i.status}</span>
                </div>
              ))}
            </Card>
          )}
          {b.refunds.length > 0 && (
            <Card><SectionHeader title="Refunds"/>
              {b.refunds.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div><div className="text-sm font-medium text-slate-900">{formatCurrency(r.amount)}</div><div className="text-xs text-slate-400">{r.reason}</div></div>
                  <span className="badge text-xs bg-amber-100 text-amber-700">{r.status}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment" subtitle={`Balance: ${formatCurrency(b.balanceDue)}`}>
        <form onSubmit={recordPayment} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">Payment will be sent for Finance approval. Sales cannot self-approve.</div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹) *</label>
            <input type="number" min="1" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20" placeholder={b.balanceDue.toString()} required/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
              <select value={payForm.paymentMethod} onChange={e=>setPayForm(p=>({...p,paymentMethod:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none">
                {["Cash","UPI","NEFT","RTGS","IMPS","Card","Cheque"].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">UTR Number {["UPI","NEFT","RTGS","IMPS"].includes(payForm.paymentMethod) && <span className="text-red-500">*</span>}</label>
              <input value={payForm.utrNumber} onChange={e=>setPayForm(p=>({...p,utrNumber:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none" placeholder="UTR..." required={["UPI","NEFT","RTGS","IMPS"].includes(payForm.paymentMethod)}/>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={()=>setPayModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?"Submitting...":"Submit for Approval"}</button>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal open={cancelModal} onClose={()=>setCancelModal(false)} title="Cancel Booking">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/>Cancellation reason is mandatory. This action cannot be undone easily.
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cancellation Reason *</label>
            <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} rows={3} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none resize-none" placeholder="Reason for cancellation..."/>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={()=>setCancelModal(false)} className="btn-secondary">Keep Booking</button>
            <button onClick={cancelBooking} disabled={!cancelReason.trim()||saving} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {saving?"Cancelling...":"Confirm Cancel"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}