import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/orders/[id]/delivery-proof — submit delivery proof
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: orderId } = await params;
    const body = await request.json();
    const { proofImages, deliveryNote } = body;

    if (!proofImages || !Array.isArray(proofImages) || proofImages.length === 0) {
      return NextResponse.json({ error: 'At least one proof image is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Only seller/delivery agent/store owner can submit delivery proof
    const isStoreOwner = order.store?.ownerId === user.id;
    const isSeller = order.sellerId === user.id;
    const isDeliveryAgent = user.role === 'DELIVERY_AGENT';
    if (!isStoreOwner && !isSeller && !isDeliveryAgent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.escrowStatus !== 'HELD' && order.escrowStatus !== 'AWAITING_DELIVERY_CONFIRMATION') {
      return NextResponse.json({ error: 'Order is not in escrow' }, { status: 400 });
    }

    // Create or update delivery proof
    const proof = await prisma.deliveryProof.upsert({
      where: { orderId },
      create: {
        orderId,
        submittedBy: user.id,
        proofImages,
        deliveryNote: deliveryNote || '',
      },
      update: {
        proofImages,
        deliveryNote: deliveryNote || '',
        submittedBy: user.id,
        submittedAt: new Date(),
        isApproved: false,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { escrowStatus: 'DELIVERY_PROOF_SUBMITTED' },
    });

    return NextResponse.json(proof, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit delivery proof' }, { status: 500 });
  }
}

// GET /api/orders/[id]/delivery-proof — get delivery proof for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: orderId } = await params;
    const proof = await prisma.deliveryProof.findUnique({
      where: { orderId },
      include: {
        submitter: { select: { id: true, name: true, avatar: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    if (!proof) return NextResponse.json({ error: 'No delivery proof found' }, { status: 404 });
    return NextResponse.json(proof);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch delivery proof' }, { status: 500 });
  }
}
