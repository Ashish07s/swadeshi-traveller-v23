import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const CAN_MANAGE = ["admin", "founder", "operations"];

interface AssignmentRow { id: string; bookingId: string; guideId: string | null; status: string; [k: string]: unknown }

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookings = await prisma.booking.findMany({
      where: { status: { not: "Cancelled" } },
      select: { id: true, bookingCode: true, customerName: true, tripName: true, tripId: true, groupId: true, journeyDate: true, paxCount: true },
      orderBy: { journeyDate: "asc" },
    });
    const bookingIds = bookings.map((b: { id: string }) => b.id);
    let assignments: AssignmentRow[] = [];
    if (bookingIds.length) {
      assignments = await prisma.guideAssignment.findMany({ where: { bookingId: { in: bookingIds } }, include: { guide: { select: { id: true, name: true, phone: true, status: true } } } });
    }
    const byBooking = new Map(assignments.map((a) => [a.bookingId, a]));

    const rows = bookings.map((b: { id: string }) => ({ ...b, assignment: byBooking.get(b.id) ?? null }));
    return NextResponse.json({ data: rows, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!CAN_MANAGE.includes(session.user.role)) return NextResponse.json({ error: "Only Operations/Admin can assign guides" }, { status: 403 });

    const body = await req.json();
    if (!body.bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const existing = await prisma.guideAssignment.findUnique({ where: { bookingId: body.bookingId } });
    const wasGuideId = existing?.guideId ?? null;

    let guideName: string | null = null;
    if (body.guideId) {
      const guide = await prisma.guide.findUnique({ where: { id: body.guideId } });
      if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      if (guide.status !== "Active") return NextResponse.json({ error: "This guide is not currently available (Inactive/On Leave)" }, { status: 400 });
      guideName = guide.name;
    }

    const removing = body.guideId === null || body.guideId === "";
    const status = removing ? "Pending" : body.status || (body.guideId ? "Assigned" : existing?.status ?? "Pending");

    const record = existing
      ? await prisma.guideAssignment.update({ where: { bookingId: body.bookingId }, data: { guideId: removing ? null : body.guideId ?? existing.guideId, status, notes: body.notes ?? existing.notes, assignedBy: session.user.name } })
      : await prisma.guideAssignment.create({ data: { bookingId: body.bookingId, guideId: body.guideId || null, status, notes: body.notes || null, assignedBy: session.user.name } });

    const action = removing ? "GUIDE_REMOVED" : wasGuideId ? "GUIDE_CHANGED" : "GUIDE_ASSIGNED";
    if (removing || (body.guideId && body.guideId !== wasGuideId)) {
      await prisma.auditLog.create({ data: { userId: session.user.id, userName: session.user.name, action, entity: "GuideAssignment", entityId: record.id, bookingId: body.bookingId, module: "Operations", oldValue: wasGuideId ? { guideId: wasGuideId } : undefined, newValue: removing ? undefined : { guideId: body.guideId, guideName } } });
    }

    return NextResponse.json({ data: record, success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed to update guide assignment" }, { status: 500 }); }
}
