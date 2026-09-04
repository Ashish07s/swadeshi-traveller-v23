import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "leads";
    if (type === "overview") {
      const [total, newL, contacted, interested, quoted, converted, lost] = await Promise.all([
        prisma.lead.count(), prisma.lead.count({ where: { stage: "New" } }), prisma.lead.count({ where: { stage: "Contacted" } }),
        prisma.lead.count({ where: { stage: "Interested" } }), prisma.lead.count({ where: { stage: "Quoted" } }),
        prisma.lead.count({ where: { stage: "Converted" } }), prisma.lead.count({ where: { stage: "Lost" } }),
      ]);
      const todayFollowUps = await prisma.followUp.count({ where: { nextFollowUp: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(23,59,59,999)) } } });
      return NextResponse.json({ data: { total, newLeads: newL, contacted, interested, quoted, converted, lost, todayFollowUps, conversionRate: total>0?Math.round((converted/total)*100):0 }, success: true });
    }
    const leads = await prisma.lead.findMany({ include: { followUps: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { followUps: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: leads, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (body.type === "follow-up") {
      const fu = await prisma.followUp.create({ data: { leadId: body.leadId, type: body.fuType||"Call", notes: body.notes, outcome: body.outcome, nextFollowUp: body.nextFollowUp?new Date(body.nextFollowUp):null, doneBy: session.user.name } });
      if (body.outcome==="Converted") await prisma.lead.update({ where: { id: body.leadId }, data: { stage: "Converted" } });
      else if (body.outcome==="NotInterested") await prisma.lead.update({ where: { id: body.leadId }, data: { stage: "Lost" } });
      return NextResponse.json({ data: fu, success: true }, { status: 201 });
    }
    const lead = await prisma.lead.create({ data: { customerName: body.customerName, phone: body.phone, whatsapp: body.whatsapp||null, email: body.email||null, city: body.city||null, source: body.source||"WhatsApp", tripInterest: body.tripInterest||null, tripType: body.tripType||null, travelDate: body.travelDate||null, budget: body.budget?Number(body.budget):null, groupSize: body.groupSize?Number(body.groupSize):null, stage: "New", priority: body.priority||"Medium", assignedTo: body.assignedTo||session.user.name, createdBy: session.user.name } });
    return NextResponse.json({ data: lead, success: true }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, ...data } = await req.json();
    const lead = await prisma.lead.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
    return NextResponse.json({ data: lead, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}