import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/delivery-jobs — list delivery jobs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const view = searchParams.get('view') || 'my'; // my | available | store

    const where: any = {};
    if (status) where.status = status;

    if (view === 'my') {
      // Delivery partner's own jobs
      where.partnerId = user.id;
    } else if (view === 'available') {
      // Available jobs (not assigned)
      where.status = 'PENDING';
      where.partnerId = null;
    } else if (view === 'store') {
      // Store owner's delivery jobs
      const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
      if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });
      where.storeId = store.id;
    }

    const jobs = await prisma.deliveryJob.findMany({
      where,
      include: {
        order: { select: { id: true, total: true, status: true } },
        partner: { select: { id: true, name: true, avatar: true } },
        deliveryPartner: { select: { name: true, phone: true, vehicleType: true } },
        store: { select: { storeName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch jobs' }, { status: 500 });
  }
}

// POST /api/delivery-jobs — create a delivery job (by store owner)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const body = await request.json();
    const { orderId, pickupAddress, deliveryAddress, notes, fee, partnerId } = body;

    if (!orderId || !pickupAddress || !deliveryAddress) {
      return NextResponse.json({ error: 'orderId, pickupAddress, and deliveryAddress required' }, { status: 400 });
    }

    // Resolve delivery partner if partnerId provided
    let deliveryPartnerId: string | null = null;
    if (partnerId) {
      const dp = await prisma.deliveryPartner.findUnique({ where: { userId: partnerId } });
      if (dp) deliveryPartnerId = dp.id;
    }

    const job = await prisma.deliveryJob.create({
      data: {
        storeId: store.id,
        orderId,
        partnerId: partnerId || null,
        deliveryPartnerId,
        pickupAddress,
        deliveryAddress,
        notes: notes || '',
        fee: fee ? parseFloat(fee) : 0,
        status: partnerId ? 'ACCEPTED' : 'PENDING',
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create job' }, { status: 500 });
  }
}

// PUT /api/delivery-jobs — accept/update delivery job status
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId || !action) {
      return NextResponse.json({ error: 'jobId and action required' }, { status: 400 });
    }

    const job = await prisma.deliveryJob.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const statusTransitions: Record<string, string> = {
      accept: 'ACCEPTED',
      pickup: 'PICKED_UP',
      transit: 'IN_TRANSIT',
      deliver: 'DELIVERED',
      fail: 'FAILED',
      cancel: 'CANCELLED',
    };

    const newStatus = statusTransitions[action];
    if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    const updateData: any = { status: newStatus };
    if (action === 'accept') {
      const dp = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
      updateData.partnerId = user.id;
      if (dp) updateData.deliveryPartnerId = dp.id;
    }
    if (action === 'pickup') updateData.pickedUpAt = new Date();
    if (action === 'deliver') updateData.deliveredAt = new Date();

    const updated = await prisma.deliveryJob.update({
      where: { id: jobId },
      data: updateData,
    });

    // Update delivery partner stats on completion
    if (action === 'deliver') {
      const dp = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
      if (dp) {
        await prisma.deliveryPartner.update({
          where: { id: dp.id },
          data: { completedJobs: { increment: 1 } },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update job' }, { status: 500 });
  }
}
