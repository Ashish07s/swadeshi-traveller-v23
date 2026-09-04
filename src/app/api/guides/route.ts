import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const CAN_MANAGE = ["admin", "founder", "operations"];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const data = await prisma.guide.findMany({ where: status ? { status } : {}, orderBy: { name: "asc" } });
    return NextResponse.json({ data, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!CAN_MANAGE.includes(session.user.role)) return NextResponse.json({ error: "Only Operations/Admin can manage guides" }, { status: 403 });
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Guide name is required" }, { status: 400 });
    const guide = await prisma.guide.create({ data: { name: body.name, phone: body.phone || null, email: body.email || null, city: body.city || null, languages: body.languages || null, specialization: body.specialization || null, experience: body.experience || null, status: body.status || "Active", notes: body.notes || null } });
    return NextResponse.json({ data: guide, success: true }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!CAN_MANAGE.includes(session.user.role)) return NextResponse.json({ error: "Only Operations/Admin can manage guides" }, { status: 403 });
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const guide = await prisma.guide.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
    return NextResponse.json({ data: guide, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
