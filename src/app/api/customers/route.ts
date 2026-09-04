import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const customers = await prisma.customer.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }, { customerId: { contains: search } }] } : {},
      include: { bookings: { select: { id: true, bookingCode: true, tripName: true, journeyDate: true, finalPackageCost: true, paymentStatus: true, status: true }, orderBy: { createdAt: "desc" } }, _count: { select: { bookings: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: customers, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}