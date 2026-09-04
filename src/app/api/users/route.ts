import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session||session.user.role!=="admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerified: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: users, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session||session.user.role!=="admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { name, email, password, role } = await req.json();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role: role as Role }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
    return NextResponse.json({ data: user, success: true }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}