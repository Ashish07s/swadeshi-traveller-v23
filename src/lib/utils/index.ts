import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function generateBookingCode(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 90000) + 10000).padStart(5, "0");
  return `BOOK-${year}-${num}`;
}
export function generateCustomerId(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 90000) + 10000).padStart(5, "0");
  return `CUS-${year}-${num}`;
}
export function generateTsId(): string {
  return `TS-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;
}
export function generateTripCode(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 90000) + 10000).padStart(5, "0");
  return `TRP-${year}-${num}`;
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
  } catch { return "—"; }
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-blue-100 text-blue-700",
};

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  Active: "bg-blue-100 text-blue-700",
  Confirmed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700",
  Completed: "bg-slate-100 text-slate-600",
  Transferred: "bg-purple-100 text-purple-700",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", sales: "Sales", ticket_admin: "Ticket Admin",
  logistics: "Logistics", finance: "Finance", operations: "Operations", founder: "Founder",
};

export const ROLE_COLOR: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  sales: "bg-blue-100 text-blue-700",
  ticket_admin: "bg-indigo-100 text-indigo-700",
  logistics: "bg-orange-100 text-orange-700",
  finance: "bg-amber-100 text-amber-700",
  operations: "bg-teal-100 text-teal-700",
  founder: "bg-rose-100 text-rose-700",
};
