
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const deliveryFees = await prisma.deliveryFee.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(deliveryFees);
  } catch (error) {
    console.error('Error fetching delivery fees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, amount, description, isDefault, zones } = await request.json();

    if (!name || amount === undefined || amount < 0) {
      return NextResponse.json({ error: 'Invalid delivery fee data' }, { status: 400 });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.deliveryFee.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const deliveryFee = await prisma.deliveryFee.create({
      data: {
        name,
        amount,
        description,
        isDefault: isDefault || false,
        zones: zones || [],
        isActive: true
      }
    });

    return NextResponse.json(deliveryFee);
  } catch (error) {
    console.error('Error creating delivery fee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, amount, description, isDefault, zones, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Delivery fee ID is required' }, { status: 400 });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.deliveryFee.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const deliveryFee = await prisma.deliveryFee.update({
      where: { id },
      data: {
        name,
        amount,
        description,
        isDefault: isDefault || false,
        zones: zones || [],
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(deliveryFee);
  } catch (error) {
    console.error('Error updating delivery fee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
