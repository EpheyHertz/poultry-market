
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      // Validate specific voucher
      const voucher = await prisma.deliveryVoucher.findUnique({
        where: { code }
      });

      if (!voucher || !voucher.isActive) {
        return NextResponse.json({ error: 'Invalid voucher code' }, { status: 404 });
      }

      if (voucher.expiresAt && new Date() > voucher.expiresAt) {
        return NextResponse.json({ error: 'Voucher has expired' }, { status: 400 });
      }

      if (voucher.maxUses && voucher.usedCount >= voucher.maxUses) {
        return NextResponse.json({ error: 'Voucher usage limit reached' }, { status: 400 });
      }

      return NextResponse.json(voucher);
    }

    // Get all active vouchers for admin/display
    const vouchers = await prisma.deliveryVoucher.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error('Error fetching delivery vouchers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      code, 
      name, 
      description, 
      discountType, 
      discountValue, 
      minOrderAmount,
      maxUses,
      expiresAt 
    } = await request.json();

    if (!code || !name || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (discountValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be positive' }, { status: 400 });
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    // Check if code already exists
    const existingVoucher = await prisma.deliveryVoucher.findUnique({
      where: { code }
    });

    if (existingVoucher) {
      return NextResponse.json({ error: 'Voucher code already exists' }, { status: 400 });
    }

    const voucher = await prisma.deliveryVoucher.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || 0,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        usedCount: 0
      }
    });

    return NextResponse.json(voucher);
  } catch (error) {
    console.error('Error creating delivery voucher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      id, 
      name, 
      description, 
      discountType, 
      discountValue, 
      minOrderAmount,
      maxUses,
      expiresAt,
      isActive 
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Voucher ID is required' }, { status: 400 });
    }

    const voucher = await prisma.deliveryVoucher.update({
      where: { id },
      data: {
        name,
        description,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || 0,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(voucher);
  } catch (error) {
    console.error('Error updating delivery voucher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
