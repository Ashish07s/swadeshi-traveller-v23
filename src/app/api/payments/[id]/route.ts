import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const now = new Date();

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};
    let action = "UPDATE";

    // Submit payment
    if (body.action === "submit") {
      updateData = {
        approvalStatus: "Submitted",
        submittedAt: now,
      };
    }

    // Approve payment
    else if (body.action === "approve") {
      if (
        !["admin", "finance", "founder"].includes(
          session.user.role
        )
      ) {
        return NextResponse.json(
          { error: "Only Finance/Admin can approve payments" },
          { status: 403 }
        );
      }

      updateData = {
        approvalStatus: "Approved",
        approvedBy: session.user.name,
        approvedAt: now,
      };

      action = "APPROVE";

      const b = payment.booking;

      const newPaid = b.totalPaid + payment.amount;
      const newBal = Math.max(
        0,
        b.finalPackageCost - newPaid
      );

      await prisma.$transaction([
        prisma.payment.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: now,
          } as never,
        }),

        prisma.booking.update({
          where: { id: b.id },
          data: {
            totalPaid: newPaid,
            balanceDue: newBal,
            paymentStatus:
              newBal === 0
                ? "PAID"
                : newPaid > 0
                ? "PARTIAL"
                : "UNPAID",
          },
        }),
      ]);

      const updated = await prisma.payment.findUnique({
        where: { id },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name,
          action,
          entity: "Payment",
          entityId: id,
          bookingId: payment.bookingId,
          paymentId: id,
          module: "Finance",
          reason: body.reason || null,
          newValue: {
            status: "Approved",
          },
        },
      });

      return NextResponse.json({
        data: updated,
        success: true,
      });
    }

    // Reject payment
    else if (body.action === "reject") {
      if (
        !["admin", "finance", "founder"].includes(
          session.user.role
        )
      ) {
        return NextResponse.json(
          { error: "Only Finance/Admin can reject payments" },
          { status: 403 }
        );
      }

      if (!body.reason) {
        return NextResponse.json(
          { error: "Rejection reason is mandatory" },
          { status: 400 }
        );
      }

      updateData = {
        approvalStatus: "Rejected",
        rejectedBy: session.user.name,
        rejectedAt: now,
        rejectionReason: body.reason,
      };

      action = "REJECT";
    }

    // Other updates
    else {
      updateData = body;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: now,
      } as never,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        action,
        entity: "Payment",
        entityId: id,
        bookingId: payment.bookingId,
        paymentId: id,
        module: "Finance",
        reason: body.reason || null,

        // FIX: convert unknown value to string
        newValue: {
          status: String(
            updateData.approvalStatus ?? ""
          ),
        },
      },
    });

    return NextResponse.json({
      data: updated,
      success: true,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { error: "Failed" },
      { status: 500 }
    );
  }
}