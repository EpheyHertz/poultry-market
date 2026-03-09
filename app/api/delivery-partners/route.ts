import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/delivery-partners — list available delivery partners (or my profile)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine') === 'true';

    if (mine) {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const partner = await prisma.deliveryPartner.findUnique({
        where: { userId: user.id },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
          _count: { select: { jobs: true } },
        },
      });
      return NextResponse.json(partner);
    }

    // Public listing of available partners
    const location = searchParams.get('location') || '';
    const where: any = { isVerified: true, isAvailable: true };
    if (location) {
      where.coverageAreas = { has: location };
    }

    const partners = await prisma.deliveryPartner.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { rating: 'desc' },
      take: 50,
    });

    return NextResponse.json(partners);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch partners' }, { status: 500 });
  }
}

// POST /api/delivery-partners — register as delivery partner
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'DELIVERY_AGENT') {
      return NextResponse.json({ error: 'Only delivery agents can register as partners' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, vehicleType, vehiclePlate, location, coverageAreas } = body;

    if (!name || !phone || !vehicleType) {
      return NextResponse.json({ error: 'name, phone, and vehicleType required' }, { status: 400 });
    }

    const existing = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
    if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 409 });

    const partner = await prisma.deliveryPartner.create({
      data: {
        userId: user.id,
        name,
        phone,
        vehicleType,
        vehiclePlate: vehiclePlate || '',
        location: location || '',
        coverageAreas: coverageAreas || [],
      },
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to register' }, { status: 500 });
  }
}

// PUT /api/delivery-partners — update availability/profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
    if (!partner) return NextResponse.json({ error: 'Not registered' }, { status: 404 });

    const body = await request.json();
    const { isAvailable, location, coverageAreas, vehicleType, vehiclePlate, phone } = body;

    const updated = await prisma.deliveryPartner.update({
      where: { userId: user.id },
      data: {
        ...(typeof isAvailable === 'boolean' && { isAvailable }),
        ...(location && { location }),
        ...(coverageAreas && { coverageAreas }),
        ...(vehicleType && { vehicleType }),
        ...(vehiclePlate && { vehiclePlate }),
        ...(phone && { phone }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}
