import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStoreByOwner } from '@/lib/store-service';
import { prisma } from '@/lib/prisma';

// GET /api/store/verification — get verification status
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const verifications = await prisma.storeVerification.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      currentLevel: store.verificationLevel,
      requests: verifications,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch verification' }, { status: 500 });
  }
}

// POST /api/store/verification — submit verification request
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const body = await request.json();
    const { requestedLevel, identityDocuments, farmPhotos, businessDocuments, additionalNotes } = body;

    if (!requestedLevel || !['IDENTITY_VERIFIED', 'FARM_VERIFIED', 'CERTIFIED_SUPPLIER'].includes(requestedLevel)) {
      return NextResponse.json({ error: 'Valid verification level required' }, { status: 400 });
    }

    // Check for existing pending requests
    const pending = await prisma.storeVerification.findFirst({
      where: { storeId: store.id, status: 'PENDING' },
    });
    if (pending) {
      return NextResponse.json({ error: 'You already have a pending verification request' }, { status: 409 });
    }

    const verification = await prisma.storeVerification.create({
      data: {
        storeId: store.id,
        requestedLevel,
        identityDocuments: identityDocuments || [],
        farmPhotos: farmPhotos || [],
        businessDocuments: businessDocuments || [],
        additionalNotes: additionalNotes || '',
      },
    });

    return NextResponse.json(verification, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit verification' }, { status: 500 });
  }
}
