import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { releaseEscrow } from '@/lib/store-service';

// POST /api/admin/delivery-approvals — approve or reject delivery proof
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, action, rejectionReason } = body;

    if (!orderId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'orderId and action (approve/reject) required' }, { status: 400 });
    }

    const proof = await prisma.deliveryProof.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!proof) return NextResponse.json({ error: 'No delivery proof found' }, { status: 404 });

    if (action === 'approve') {
      await prisma.deliveryProof.update({
        where: { orderId },
        data: {
          isApproved: true,
          approvedBy: user.id,
          approvedAt: new Date(),
        },
      });

      // Release escrow to seller
      await releaseEscrow(orderId);

      return NextResponse.json({ message: 'Delivery approved, escrow released' });
    } else {
      await prisma.$transaction([
        prisma.deliveryProof.update({
          where: { orderId },
          data: {
            isApproved: false,
            rejectionReason: rejectionReason || 'Rejected by admin',
          },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { escrowStatus: 'AWAITING_DELIVERY_CONFIRMATION' },
        }),
      ]);

      return NextResponse.json({ message: 'Delivery proof rejected' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process approval' }, { status: 500 });
  }
}

// GET /api/admin/delivery-approvals — list pending delivery proofs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'pending'; // pending, approved, rejected

    const where: any = {};
    if (status === 'pending') where.isApproved = false;
    if (status === 'approved') where.isApproved = true;

    const [proofs, total] = await Promise.all([
      prisma.deliveryProof.findMany({
        where,
        include: {
          order: {
            select: {
              id: true, total: true, escrowAmount: true,
              escrowStatus: true, status: true,
              customer: { select: { name: true } },
              seller: { select: { name: true } },
              store: { select: { storeName: true } },
            },
          },
          submitter: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deliveryProof.count({ where }),
    ]);

    return NextResponse.json({
      proofs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch proofs' }, { status: 500 });
  }
}
