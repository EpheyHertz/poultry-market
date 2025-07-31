import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// PUT /api/profile/delivery-settings - Update delivery settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.role as UserRole;
    
    // Only sellers and companies can update delivery settings
    if (!['SELLER', 'COMPANY'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Only sellers and companies can update delivery settings' 
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      offersDelivery,
      offersPayAfterDelivery,
      offersFreeDelivery,
      deliveryProvinces,
      deliveryCounties,
      minOrderForFreeDelivery,
      deliveryFeePerKm
    } = body;

    // Validate data
    if (typeof offersDelivery !== 'boolean') {
      return NextResponse.json({ 
        error: 'offersDelivery must be a boolean' 
      }, { status: 400 });
    }

    if (offersDelivery) {
      if (typeof offersPayAfterDelivery !== 'boolean') {
        return NextResponse.json({ 
          error: 'offersPayAfterDelivery must be a boolean' 
        }, { status: 400 });
      }

      if (typeof offersFreeDelivery !== 'boolean') {
        return NextResponse.json({ 
          error: 'offersFreeDelivery must be a boolean' 
        }, { status: 400 });
      }

      if (!Array.isArray(deliveryProvinces) || !Array.isArray(deliveryCounties)) {
        return NextResponse.json({ 
          error: 'deliveryProvinces and deliveryCounties must be arrays' 
        }, { status: 400 });
      }

      if (deliveryProvinces.length === 0 && deliveryCounties.length === 0) {
        return NextResponse.json({ 
          error: 'At least one province or county must be selected for delivery' 
        }, { status: 400 });
      }
    }

    // Update user delivery settings
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        offersDelivery: offersDelivery || false,
        offersPayAfterDelivery: offersDelivery ? (offersPayAfterDelivery || false) : false,
        offersFreeDelivery: offersDelivery ? (offersFreeDelivery || false) : false,
        deliveryProvinces: offersDelivery ? (deliveryProvinces || []) : [],
        deliveryCounties: offersDelivery ? (deliveryCounties || []) : [],
        minOrderForFreeDelivery: (offersDelivery && offersFreeDelivery) ? 
          (parseFloat(minOrderForFreeDelivery) || 0) : null,
        deliveryFeePerKm: (offersDelivery && !offersFreeDelivery) ? 
          (parseFloat(deliveryFeePerKm) || 0) : null
      },
      select: {
        id: true,
        offersDelivery: true,
        offersPayAfterDelivery: true,
        offersFreeDelivery: true,
        deliveryProvinces: true,
        deliveryCounties: true,
        minOrderForFreeDelivery: true,
        deliveryFeePerKm: true
      }
    });

    return NextResponse.json({
      message: 'Delivery settings updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating delivery settings:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery settings' },
      { status: 500 }
    );
  }
}
