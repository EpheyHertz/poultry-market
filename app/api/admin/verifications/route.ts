import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/verifications — list verification requests
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'PENDING';

    const where: any = {};
    if (status !== 'all') where.status = status;

    const [verifications, total] = await Promise.all([
      prisma.storeVerification.findMany({
        where,
        include: {
          store: {
            select: { id: true, storeName: true, storeSlug: true, verificationLevel: true, owner: { select: { name: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storeVerification.count({ where }),
    ]);

    return NextResponse.json({
      verifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch verifications' }, { status: 500 });
  }
}

// POST /api/admin/verifications — approve or reject verification
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { verificationId, action, rejectionReason } = body;

    if (!verificationId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'verificationId and action (approve/reject) required' }, { status: 400 });
    }

    const verification = await prisma.storeVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
    if (verification.status !== 'PENDING') {
      return NextResponse.json({ error: 'Already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      await prisma.$transaction([
        prisma.storeVerification.update({
          where: { id: verificationId },
          data: {
            status: 'APPROVED',
            reviewedBy: user.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.store.update({
          where: { id: verification.storeId },
          data: { verificationLevel: verification.requestedLevel },
        }),
      ]);

      return NextResponse.json({ message: 'Verification approved' });
    } else {
      await prisma.storeVerification.update({
        where: { id: verificationId },
        data: {
          status: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason || 'Rejected by admin',
        },
      });

      return NextResponse.json({ message: 'Verification rejected' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process verification' }, { status: 500 });
  }
}
