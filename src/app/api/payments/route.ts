import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

function genPayCode() {
  return `PAY-${new Date().getFullYear()}-${String(
    Math.floor(Math.random() * 90000) + 10000
  )}`;
}

// GET - Fetch payments
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const bookingId = searchParams.get("bookingId");

    const payments = await prisma.payment.findMany({
      where: {
        ...(status && status !== "All"
          ? { approvalStatus: status as never }
          : {}),
        ...(bookingId ? { bookingId } : {}),
      },
      include: {
        booking: {
          select: {
            bookingCode: true,
            customerName: true,
            tripName: true,
            finalPackageCost: true,
            journeyDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      data: payments,
      success: true,
    });
  } catch (e) {
    console.error("GET payments error:", e);

    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST - Create payment
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (
      !body.bookingId ||
      !body.amount ||
      !body.paymentMethod
    ) {
      return NextResponse.json(
        {
          error: "Booking, amount and method required",
        },
        { status: 400 }
      );
    }

    if (Number(body.amount) <= 0) {
      return NextResponse.json(
        {
          error: "Payment amount must be greater than zero",
        },
        { status: 400 }
      );
    }

    if (body.utrNumber) {
      const dup = await prisma.payment.findFirst({
        where: {
          utrNumber: body.utrNumber,
        },
      });

      if (dup) {
        return NextResponse.json(
          {
            error:
              "UTR number already exists — duplicate payment blocked",
          },
          { status: 400 }
        );
      }
    }

    const requiresUTR = [
      "UPI",
      "NEFT",
      "RTGS",
      "IMPS",
      "Bank Transfer",
    ].includes(body.paymentMethod);

    if (requiresUTR && !body.utrNumber) {
      return NextResponse.json(
        {
          error: `UTR is mandatory for ${body.paymentMethod}`,
        },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        paymentCode: genPayCode(),
        bookingId: body.bookingId,
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod,
        utrNumber: body.utrNumber || null,
        paymentDate: body.paymentDate
          ? new Date(body.paymentDate)
          : new Date(),
        enteredBy: session.user.name,
        enteredByRole: session.user.role,
        approvalStatus: "Pending",
        notes: body.notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        action: "CREATE",
        entity: "Payment",
        entityId: payment.id,
        bookingId: body.bookingId,
        paymentId: payment.id,
        module: "Finance",
        newValue: {
          amount: Number(body.amount),
          method: String(body.paymentMethod),
          utr: body.utrNumber
            ? String(body.utrNumber)
            : null,
        },
      },
    });

    return NextResponse.json(
      {
        data: payment,
        success: true,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST payment error:", e);

    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
