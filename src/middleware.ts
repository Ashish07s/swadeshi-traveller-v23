import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_HOME: Record<string, string> = {
  admin: "/dashboard", founder: "/dashboard", sales: "/sales/bookings",
  ticket_admin: "/tickets", logistics: "/logistics",
  finance: "/finance", operations: "/operations",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth") || pathname.startsWith("/favicon")) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isLoggedIn = !!token;
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const url = req.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);
  }
  if (isLoggedIn && isLoginPage) {
    const role = (token.role as string) ?? "sales";
    const url = req.nextUrl.clone(); url.pathname = ROLE_HOME[role] ?? "/dashboard"; return NextResponse.redirect(url);
  }
  if (isLoggedIn && pathname === "/") {
    const role = (token.role as string) ?? "sales";
    const url = req.nextUrl.clone(); url.pathname = ROLE_HOME[role] ?? "/dashboard"; return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.png$|.*\.ico$).*)"] };