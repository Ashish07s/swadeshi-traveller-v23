import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const vendors = await prisma.vendor.findMany({ where: { ...(activeOnly ? { isActive: true } : {}), ...(type ? { type: type as never } : {}) }, orderBy: { name: "asc" } });
    return NextResponse.json({ data: vendors, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "founder", "finance"].includes(session.user.role)) {
      return NextResponse.json({ error: "Only Finance/Admin can manage the vendor master" }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name || !body.type) return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    const vendor = await prisma.vendor.create({ data: { vendorCode: "VND-"+Date.now().toString().slice(-6), name: body.name, type: body.type as never, contactName: body.contactName||null, phone: body.phone||null, email: body.email||null, city: body.city||null, address: body.address||null, gstNumber: body.gstNumber||null, bankName: body.bankName||null, accountNo: body.accountNo||null, ifscCode: body.ifscCode||null, priceRate: body.priceRate?Number(body.priceRate):null, rateUnit: body.rateUnit||null, notes: body.notes||null } });
    return NextResponse.json({ data: vendor, success: true }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}