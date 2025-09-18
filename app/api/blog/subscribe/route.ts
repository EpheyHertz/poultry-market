import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1).max(100).optional(),
  weeklyDigest: z.boolean().default(true),
  newPostAlerts: z.boolean().default(true),
  categoryUpdates: z.array(z.string()).optional(),
});

const updateSubscriptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  weeklyDigest: z.boolean().optional(),
  newPostAlerts: z.boolean().optional(),
  categoryUpdates: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// GET - Get subscription status (for logged-in users or by email)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const subscription = await prisma.blogSubscriber.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        weeklyDigest: true,
        newPostAlerts: true,
        categoryUpdates: true,
        createdAt: true
      }
    });

    if (!subscription) {
      return NextResponse.json(
        { subscribed: false }
      );
    }

    return NextResponse.json({
      subscribed: true,
      subscription: {
        ...subscription,
        categoryUpdates: subscription.categoryUpdates 
          ? JSON.parse(subscription.categoryUpdates) 
          : []
      }
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST - Subscribe to blog newsletter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = subscribeSchema.parse(body);

    // Check if already subscribed
    const existingSubscription = await prisma.blogSubscriber.findUnique({
      where: { email: validatedData.email }
    });

    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return NextResponse.json(
          { error: 'Email is already subscribed' },
          { status: 409 }
        );
      } else {
        // Reactivate existing subscription
        const updatedSubscription = await prisma.blogSubscriber.update({
          where: { email: validatedData.email },
          data: {
            name: validatedData.name || existingSubscription.name,
            isActive: true,
            weeklyDigest: validatedData.weeklyDigest,
            newPostAlerts: validatedData.newPostAlerts,
            categoryUpdates: validatedData.categoryUpdates 
              ? JSON.stringify(validatedData.categoryUpdates)
              : null
          }
        });

        return NextResponse.json({
          message: 'Successfully resubscribed to blog newsletter',
          subscription: {
            ...updatedSubscription,
            categoryUpdates: updatedSubscription.categoryUpdates
              ? JSON.parse(updatedSubscription.categoryUpdates)
              : []
          }
        });
      }
    }

    // Create new subscription
    const subscription = await prisma.blogSubscriber.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        weeklyDigest: validatedData.weeklyDigest,
        newPostAlerts: validatedData.newPostAlerts,
        categoryUpdates: validatedData.categoryUpdates 
          ? JSON.stringify(validatedData.categoryUpdates)
          : null
      }
    });

    return NextResponse.json({
      message: 'Successfully subscribed to blog newsletter',
      subscription: {
        ...subscription,
        categoryUpdates: subscription.categoryUpdates
          ? JSON.parse(subscription.categoryUpdates)
          : []
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

// PUT - Update subscription preferences
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateSubscriptionSchema.parse(body);

    // Check if subscription exists
    const existingSubscription = await prisma.blogSubscriber.findUnique({
      where: { email }
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.weeklyDigest !== undefined) updateData.weeklyDigest = validatedData.weeklyDigest;
    if (validatedData.newPostAlerts !== undefined) updateData.newPostAlerts = validatedData.newPostAlerts;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    
    if (validatedData.categoryUpdates !== undefined) {
      updateData.categoryUpdates = validatedData.categoryUpdates.length > 0
        ? JSON.stringify(validatedData.categoryUpdates)
        : null;
    }

    const updatedSubscription = await prisma.blogSubscriber.update({
      where: { email },
      data: updateData
    });

    return NextResponse.json({
      message: 'Subscription updated successfully',
      subscription: {
        ...updatedSubscription,
        categoryUpdates: updatedSubscription.categoryUpdates
          ? JSON.parse(updatedSubscription.categoryUpdates)
          : []
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from newsletter
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Check if subscription exists
    const existingSubscription = await prisma.blogSubscriber.findUnique({
      where: { email }
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Soft delete - just deactivate
    await prisma.blogSubscriber.update({
      where: { email },
      data: { isActive: false }
    });

    return NextResponse.json({
      message: 'Successfully unsubscribed from blog newsletter'
    });

  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}