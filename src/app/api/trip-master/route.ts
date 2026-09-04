import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("all") !== "1";

  const trips = await prisma.tripMaster.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: trips });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "founder", "finance"].includes(session.user.role)) {
    return NextResponse.json({ error: "Not authorized to manage trip master" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.name || !body.category || !body.destination) {
      return NextResponse.json({ error: "Name, destination and category are required" }, { status: 400 });
    }

    if (body.id) {
      const trip = await prisma.tripMaster.update({
        where: { id: body.id },
        data: {
          name: body.name,
          destination: body.destination,
          category: body.category,
          defaultDays: body.defaultDays ? Number(body.defaultDays) : null,
          basePrice: body.basePrice ? Number(body.basePrice) : null,
          inclusions: body.inclusions || null,
          description: body.description || null,
          isActive: body.isActive ?? true,
        },
      });
      return NextResponse.json({ data: trip });
    }

    const trip = await prisma.tripMaster.create({
      data: {
        name: body.name,
        destination: body.destination,
        category: body.category,
        defaultDays: body.defaultDays ? Number(body.defaultDays) : null,
        basePrice: body.basePrice ? Number(body.basePrice) : null,
        inclusions: body.inclusions || null,
        description: body.description || null,
      },
    });
    return NextResponse.json({ data: trip }, { status: 201 });
  } catch (err) {
    console.error("Create trip master error:", err);
    return NextResponse.json({ error: "Failed to save trip" }, { status: 500 });
  }
}
