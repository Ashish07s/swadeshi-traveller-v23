import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

const ROLE_HOME: Record<string, string> = {
  admin: "/dashboard",
  founder: "/dashboard",
  sales: "/sales/bookings",
  ticket_admin: "/tickets",
  logistics: "/logistics",
  finance: "/finance",
  operations: "/operations",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow Next.js internal files and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname === "/login";

  // Not logged in → send to login
  if (!isLoggedIn && !isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";

    return NextResponse.redirect(url);
  }

  // Already logged in → don't allow login page
  if (isLoggedIn && isLoginPage) {
    const role = req.auth?.user?.role ?? "sales";

    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? "/dashboard";

    return NextResponse.redirect(url);
  }

  // Logged in and opening root URL
  if (isLoggedIn && pathname === "/") {
    const role = req.auth?.user?.role ?? "sales";

    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? "/dashboard";

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};