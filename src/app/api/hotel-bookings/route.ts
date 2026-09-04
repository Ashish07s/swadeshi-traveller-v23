import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const tripName = searchParams.get("tripName");
    const data = await prisma.hotelBooking.findMany({ where: tripName?{tripName}:{}, include: { vendor: { select: { name: true, phone: true } } }, orderBy: { checkIn: "asc" } });
    return NextResponse.json({ data, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const nights = body.checkIn&&body.checkOut ? Math.ceil((new Date(body.checkOut).getTime()-new Date(body.checkIn).getTime())/(1000*60*60*24)) : 1;
    const totalCost = Number(body.ratePerRoom||0)*Number(body.roomCount||1)*nights;
    const hotel = await prisma.hotelBooking.create({ data: { tripName: body.tripName||null, bookingId: body.bookingId||null, vendorId: body.vendorId||null, hotelName: body.hotelName, city: body.city||null, area: body.area||null, checkIn: new Date(body.checkIn), checkOut: new Date(body.checkOut), nights, roomCount: Number(body.roomCount)||1, guestCount: Number(body.guestCount)||1, roomType: body.roomType||null, ratePerRoom: Number(body.ratePerRoom)||0, totalCost, mealPlan: body.mealPlan||null, confirmationNo: body.confirmationNo||null, hotelPhone: body.hotelPhone||null, specialRequests: body.specialRequests||null, bookedBy: session.user.name, status: "Pending", paymentStatus: "Unpaid" } });
    return NextResponse.json({ data: hotel, success: true }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, ...data } = await req.json();
    const hotel = await prisma.hotelBooking.update({ where: { id }, data: { ...data, updatedAt: new Date() } as never });
    return NextResponse.json({ data: hotel, success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}