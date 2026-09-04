import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session||session.user.role!=="admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ data: logs, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}