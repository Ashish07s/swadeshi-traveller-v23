"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, Users, ExternalLink, Bus, Hotel } from "lucide-react";
import { PageHeader, Card, Modal } from "@/components/shared";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface DeparturePassenger { id: string; name: string; age?: number | null; gender?: string | null; phone?: string | null }
interface DepartureBooking {
  id: string; bookingCode: string; customerName: string; phoneNumber: string;
  paxCount: number; status: string; createdAt: string;
  journeyDate: string; returnDate?: string | null; natureOfTrip: string;
  roomType?: string | null; accommodationType?: string | null;
  onwardTicketType?: string | null; onwardClass?: string | null;
  finalPackageCost: number; advancePaid: number; totalPaid: number; balanceDue: number;
  passengers: DeparturePassenger[];
}
interface DepartureHotel { id: string; hotelName: string; city?: string | null; checkIn: string; checkOut: string; roomType?: string | null; status: string; vendor?: { name: string } | null }
interface DepartureTransport { id: string; vehicleType?: string | null; vehicleNumber?: string | null; driverName?: string | null; pickupDate?: string | null; status: string; vendor?: { name: string } | null }
interface DepartureItem {
  kind: "departure";
  id: string; eventType: "DEPARTURE"; title: string; tripName: string; date: string;
  department?: string; status: string; totalPax: number; bookingCount: number;
  primaryBookingId: string | null; bookings: DepartureBooking[];
  totals: { tripCost: number; advance: number; payment: number; balance: number };
  hotelBookings: DepartureHotel[]; transportBookings: DepartureTransport[];
}
interface PlainEvent {
  kind: "event";
  id: string; eventType: string; title: string; date: string;
  customerName?: string; destination?: string; department?: string; status: string; notes?: string;
  booking?: { id: string; bookingCode: string; customerName: string; tripName: string; paxCount: number };
}
type CalItem = DepartureItem | PlainEvent;

const EVENT_COLOR: Record<string, string> = {
  DEPARTURE: "bg-blue-100 text-blue-700 border-blue-200",
  BALANCE_DUE: "bg-red-100 text-red-700 border-red-200",
  PAYMENT_DUE: "bg-amber-100 text-amber-700 border-amber-200",
  TICKET_BOOKING: "bg-purple-100 text-purple-700 border-purple-200",
  REFUND: "bg-orange-100 text-orange-700 border-orange-200",
  CANCELLATION: "bg-red-100 text-red-700 border-red-200",
  VENDOR_PAYMENT: "bg-teal-100 text-teal-700 border-teal-200",
};

export default function CalendarPage() {
  const [items, setItems] = useState<CalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<number|null>(null);
  const [openDeparture, setOpenDeparture] = useState<DepartureItem | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  });

  useEffect(() => { fetchEvents(); }, [month]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${month}`);
      const json = await res.json();
      setItems(json.data ?? []);
    } catch { toast.error("Failed to load calendar"); }
    finally { setLoading(false); }
  }

  function prevMonth() {
    const [y,m] = month.split("-").map(Number);
    const d = new Date(y, m-2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  function nextMonth() {
    const [y,m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }

  const [calYear, calMonth] = month.split("-").map(Number);
  const firstDay = new Date(calYear, calMonth-1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const monthLabel = new Date(calYear, calMonth-1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

  const byDay = items.reduce<Record<number, CalItem[]>>((acc, e) => {
    const day = new Date(e.date).getDate();
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});

  const now = new Date();
  const isToday = (day: number) => day === now.getDate() && calMonth === now.getMonth()+1 && calYear === now.getFullYear();

  const departureCount = items.filter((e) => e.kind === "departure").length;
  const otherCount = items.length - departureCount;

  function dayLabel(dayItems: CalItem[]) {
    const deps = dayItems.filter((e) => e.kind === "departure").length;
    const others = dayItems.length - deps;
    const parts: string[] = [];
    if (deps > 0) parts.push(`${deps} departure${deps > 1 ? "s" : ""}`);
    if (others > 0) parts.push(`${others} event${others > 1 ? "s" : ""}`);
    return parts.join(", ") || "0 events";
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" subtitle="Trip departures and other events auto-created from bookings, payments and trips" breadcrumb="Calendar"/>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-2 py-1.5">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft className="w-4 h-4"/></button>
          <span className="text-sm font-semibold text-slate-900 min-w-[160px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight className="w-4 h-4"/></button>
        </div>
        <div className="text-xs text-slate-400">
          {departureCount} departure{departureCount !== 1 ? "s" : ""}{otherCount > 0 ? ` · ${otherCount} other event${otherCount !== 1 ? "s" : ""}` : ""} this month
        </div>
      </div>
      <Card>
        <div className="grid grid-cols-7 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_,i) => <div key={`e${i}`} className="min-h-[90px]"/>)}
          {Array.from({ length: daysInMonth }, (_,i) => i+1).map((day) => {
            const dayItems = byDay[day] ?? [];
            return (
              <div key={day} onClick={() => { setSelectedDay(day); setSelected(dayItems); }}
                className={cn("min-h-[90px] rounded-xl border p-1.5 cursor-pointer transition-colors hover:border-[#0F4C81]/40",
                  isToday(day) ? "border-[#0F4C81] bg-blue-50/50" : "border-[#E2E8F0]",
                  selectedDay === day ? "ring-2 ring-[#0F4C81]/20" : "")}>
                <div className={cn("text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-[#0F4C81] text-white" : "text-slate-600")}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayItems.slice(0,3).map((e) => (
                    <div key={e.id} className={cn("text-[9px] px-1.5 py-0.5 rounded border truncate font-medium", EVENT_COLOR[e.eventType] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                      {e.kind === "departure" ? `${e.title} · ${e.totalPax} PAX` : e.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && <div className="text-[9px] text-slate-400 pl-1">+{dayItems.length-3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {selectedDay && selected.length > 0 && (
        <Card>
          <div className="font-semibold text-slate-900 mb-3">{selectedDay} {monthLabel} — {dayLabel(selected)}</div>
          <div className="space-y-2">
            {selected.map((e) => e.kind === "departure" ? (
              <button key={e.id} onClick={() => setOpenDeparture(e)}
                className={cn("w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors hover:brightness-95", EVENT_COLOR[e.eventType] ?? "bg-slate-50 border-slate-200")}>
                <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                <div className="flex-1">
                  <div className="font-medium text-sm">{e.title}</div>
                  <div className="text-xs opacity-70 flex gap-2 mt-0.5 flex-wrap items-center">
                    <span>Group Departure</span>
                    <span>· {e.totalPax} PAX</span>
                    <span>· {e.bookingCount} booking{e.bookingCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-xs underline mt-0.5 flex items-center gap-1">View departure sheet <ExternalLink className="w-3 h-3"/></div>
                </div>
                <span className={cn("badge text-[10px]", e.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{e.status}</span>
              </button>
            ) : (
              <div key={e.id} className={cn("flex items-start gap-3 p-3 rounded-xl border", EVENT_COLOR[e.eventType] ?? "bg-slate-50 border-slate-200")}>
                <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                <div className="flex-1">
                  <div className="font-medium text-sm">{e.title}</div>
                  <div className="text-xs opacity-70 flex gap-2 mt-0.5 flex-wrap">
                    {e.eventType && <span>{e.eventType.replace(/_/g," ")}</span>}
                    {e.department && <span>· {e.department}</span>}
                    {e.customerName && <span>· {e.customerName}</span>}
                  </div>
                  {e.booking && (
                    <Link href={`/sales/bookings/${e.booking.id}`} className="text-xs underline mt-0.5 block">
                      {e.booking.bookingCode} — {e.booking.tripName} · {e.booking.paxCount} pax — view all customer & pax details →
                    </Link>
                  )}
                </div>
                <span className={cn("badge text-[10px]", e.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{e.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <DepartureSheet departure={openDeparture} onClose={() => setOpenDeparture(null)} />
    </div>
  );
}

// One row per passenger. Trip/ticket/room/financial fields live on the
// Booking record, not per-passenger, so they're only printed once — on the
// first (primary) row of each booking — and left blank on the rest of that
// booking's rows. This mirrors how the source spreadsheet merges those
// cells for a group, and keeps which-passenger-belongs-to-which-booking
// obvious without falling back to one card per booking.
interface PassengerRow {
  key: string; sno: number; name: string; age: string; gender: string; phone: string;
  isPrimary: boolean; bookingId: string; bookingCode: string; status: string;
  isFirstOfBooking: boolean; isNewBookingGroup: boolean;
  up: string; ret: string; ticket: string; room: string;
  price: string; advance: string; payment: string; balance: string;
  pendingNote: string | null;
}

function buildPassengerRows(departure: DepartureItem): PassengerRow[] {
  const rows: PassengerRow[] = [];
  let sno = 0;
  departure.bookings.forEach((b, bookingIdx) => {
    const isPrimaryBooking = b.id === departure.primaryBookingId;
    const ticket = [b.onwardTicketType, b.onwardClass].filter(Boolean).join(" · ") || "—";
    const room = b.roomType || b.accommodationType || "—";
    sno += 1;
    rows.push({
      key: `${b.id}-primary`, sno, name: b.customerName, age: "—", gender: "—", phone: b.phoneNumber || "—",
      isPrimary: isPrimaryBooking, bookingId: b.id, bookingCode: b.bookingCode, status: b.status,
      isFirstOfBooking: true, isNewBookingGroup: bookingIdx > 0,
      up: formatDate(b.journeyDate), ret: b.returnDate ? formatDate(b.returnDate) : "—",
      ticket, room,
      price: formatCurrency(b.finalPackageCost), advance: formatCurrency(b.advancePaid),
      payment: formatCurrency(b.totalPaid), balance: formatCurrency(b.balanceDue),
      pendingNote: null,
    });
    b.passengers.forEach((p) => {
      sno += 1;
      rows.push({
        key: p.id, sno, name: p.name, age: p.age ? String(p.age) : "—", gender: p.gender || "—", phone: p.phone || "—",
        isPrimary: false, bookingId: b.id, bookingCode: b.bookingCode, status: b.status,
        isFirstOfBooking: false, isNewBookingGroup: false,
        up: "", ret: "", ticket: "", room: "", price: "", advance: "", payment: "", balance: "",
        pendingNote: null,
      });
    });
    const pendingCount = Math.max(0, b.paxCount - 1 - b.passengers.length);
    if (pendingCount > 0) {
      // Informational row, not a counted passenger — doesn't take an S# slot.
      rows.push({
        key: `${b.id}-pending`, sno: 0, name: "", age: "", gender: "", phone: "",
        isPrimary: false, bookingId: b.id, bookingCode: b.bookingCode, status: b.status,
        isFirstOfBooking: false, isNewBookingGroup: false,
        up: "", ret: "", ticket: "", room: "", price: "", advance: "", payment: "", balance: "",
        pendingNote: `${pendingCount} more PAX · Passenger details pending`,
      });
    }
  });
  return rows;
}

const COLS: { key: keyof PassengerRow; label: string; width: number; sticky?: boolean }[] = [
  { key: "sno", label: "S#", width: 40, sticky: true },
  { key: "name", label: "Name", width: 160, sticky: true },
  { key: "age", label: "Age", width: 56 },
  { key: "gender", label: "Gender", width: 72 },
  { key: "phone", label: "Phone", width: 112 },
  { key: "bookingCode", label: "Booking", width: 140 },
  { key: "up", label: "Up", width: 90 },
  { key: "ret", label: "Return", width: 90 },
  { key: "ticket", label: "Ticket", width: 110 },
  { key: "room", label: "Room", width: 110 },
  { key: "price", label: "Price", width: 96 },
  { key: "advance", label: "Advance", width: 96 },
  { key: "payment", label: "Payment", width: 96 },
  { key: "balance", label: "Balance", width: 96 },
  { key: "status", label: "Status", width: 84 },
];

function DepartureSheet({ departure, onClose }: { departure: DepartureItem | null; onClose: () => void }) {
  if (!departure) return null;
  const rows = buildPassengerRows(departure);
  const stickyLeft: number[] = [];
  let acc = 0;
  for (const c of COLS) { stickyLeft.push(acc); if (c.sticky) acc += c.width; }

  return (
    <Modal
      open={!!departure}
      onClose={onClose}
      title={departure.title}
      subtitle={`${formatDate(departure.date)} · Group Departure`}
      size="sheet"
      contentClassName="p-5 overflow-y-auto max-h-[90vh]"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">{departure.totalPax} PAX</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">{departure.bookingCount} Booking{departure.bookingCount > 1 ? "s" : ""}</span>
          <span className={cn("badge text-[10px]", departure.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{departure.status}</span>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Passenger Sheet</div>
          <div className="rounded-xl border border-[#E2E8F0] overflow-auto max-h-[52vh]">
            <table className="border-collapse text-xs" style={{ width: "max-content", minWidth: "100%" }}>
              <thead>
                <tr>
                  {COLS.map((c, i) => (
                    <th key={c.key} style={{ width: c.width, minWidth: c.width, ...(c.sticky ? { position: "sticky" as const, left: stickyLeft[i], zIndex: 20 } : {}) }}
                      className="text-left font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-r border-[#E2E8F0] px-2 py-2 sticky top-0 z-10">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={cn(r.isNewBookingGroup && "border-t-2 border-t-slate-200", r.isPrimary ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-slate-50/70")}>
                    {COLS.map((c, i) => {
                      const value = r[c.key];
                      const isNameCol = c.key === "name";
                      const isSnoCol = c.key === "sno";
                      return (
                        <td key={c.key}
                          style={{ width: c.width, minWidth: c.width, ...(c.sticky ? { position: "sticky" as const, left: stickyLeft[i], zIndex: 5 } : {}) }}
                          className={cn(
                            "px-2 py-1.5 border-b border-r border-slate-100 whitespace-nowrap",
                            c.sticky && "bg-white",
                            r.isPrimary && c.sticky && "bg-amber-50",
                            c.key === "bookingCode" ? "text-[#0F4C81]" : "text-slate-700"
                          )}>
                          {r.pendingNote && isNameCol ? (
                            <span className="text-slate-400 italic">{r.pendingNote}</span>
                          ) : r.pendingNote && (isSnoCol || c.key === "status" || c.key === "bookingCode") ? (
                            c.key === "bookingCode" ? (
                              <Link href={`/sales/bookings/${r.bookingId}`} className="underline font-medium text-[10px]">{r.bookingCode}</Link>
                            ) : c.key === "status" ? (
                              <span className={cn("badge text-[9px]", r.status === "Active" ? "bg-emerald-100 text-emerald-700" : r.status === "Cancelled" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>{r.status}</span>
                            ) : null
                          ) : r.pendingNote ? null : c.key === "bookingCode" ? (
                            <Link href={`/sales/bookings/${r.bookingId}`} className="underline font-medium">{String(value)}</Link>
                          ) : isNameCol ? (
                            <span className="flex items-center gap-1 font-medium text-slate-900">
                              {r.isPrimary && "🟨"} {String(value)}
                              {r.isPrimary && <span className="ml-1 text-[9px] font-semibold text-amber-700">PRIMARY</span>}
                            </span>
                          ) : c.key === "status" ? (
                            <span className={cn("badge text-[9px]", value === "Active" ? "bg-emerald-100 text-emerald-700" : value === "Cancelled" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>{String(value)}</span>
                          ) : (
                            <span className={value ? "" : "text-slate-300"}>{value ? String(value) : "—"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#E2E8F0] p-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Trip Details</div>
            <div className="text-xs text-slate-600 space-y-0.5">
              <div>Trip Type: <span className="text-slate-900 font-medium">{(departure.bookings[0]?.natureOfTrip || "—").replace(/([a-z])([A-Z])/g, "$1 $2")}</span></div>
              <div>Departure Date: <span className="text-slate-900 font-medium">{formatDate(departure.date)}</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Bus className="w-3 h-3"/> Vehicle</div>
            {departure.transportBookings.length === 0 ? (
              <div className="text-xs text-slate-300">—</div>
            ) : (
              <div className="text-xs text-slate-600 space-y-1">
                {departure.transportBookings.map((t) => (
                  <div key={t.id}>{t.vehicleType || "Vehicle"}{t.vehicleNumber ? ` · ${t.vehicleNumber}` : ""}{t.vendor?.name ? ` · ${t.vendor.name}` : ""}</div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Hotel className="w-3 h-3"/> Accommodation</div>
            {departure.hotelBookings.length === 0 ? (
              <div className="text-xs text-slate-300">—</div>
            ) : (
              <div className="text-xs text-slate-600 space-y-1">
                {departure.hotelBookings.map((h) => (
                  <div key={h.id}>{h.hotelName}{h.city ? ` · ${h.city}` : ""} · {formatDate(h.checkIn)} – {formatDate(h.checkOut)}</div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Payment Summary</div>
            <div className="text-xs text-slate-600 space-y-0.5">
              <div>Total Trip Cost: <span className="text-slate-900 font-medium">{formatCurrency(departure.totals.tripCost)}</span></div>
              <div>Total Advance: <span className="text-slate-900 font-medium">{formatCurrency(departure.totals.advance)}</span></div>
              <div>Total Payment: <span className="text-slate-900 font-medium">{formatCurrency(departure.totals.payment)}</span></div>
              <div>Total Balance: <span className="text-slate-900 font-medium">{formatCurrency(departure.totals.balance)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5"/>
          Individual bookings stay linked to their own booking, payment and ticket records — click a booking code above to open it.
        </div>
      </div>
    </Modal>
  );
}
