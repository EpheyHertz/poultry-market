import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Only delivery agents and customers can upload delivery photos
    if (!user || !['DELIVERY_AGENT', 'CUSTOMER'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const deliveryId = formData.get('deliveryId') as string;
    const caption = formData.get('caption') as string;
    const photoType = formData.get('photoType') as string || 'DELIVERY_PROOF';

    if (!file || !deliveryId) {
      return NextResponse.json({ error: 'Photo and delivery ID are required' }, { status: 400 });
    }

    // Verify the delivery exists and user has permission
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            customer: true
          }
        },
        agent: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Check if user is authorized to upload photos for this delivery
    const isDeliveryAgent = delivery.agentId === user.id;
    const isCustomer = delivery.order.customerId === user.id;

    if (!isDeliveryAgent && !isCustomer) {
      return NextResponse.json({ error: 'Not authorized for this delivery' }, { status: 403 });
    }

    // Convert file to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'delivery-photos',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    }) as any;

    // Save photo record to database
    const deliveryPhoto = await prisma.deliveryPhoto.create({
      data: {
        deliveryId,
        uploadedBy: user.id,
        photoUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        caption: caption || null,
        photoType: photoType as any
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Send notifications to relevant parties
    await sendDeliveryPhotoNotifications(delivery, deliveryPhoto, user.role);

    return NextResponse.json({
      success: true,
      photo: deliveryPhoto
    });

  } catch (error) {
    console.error('Upload delivery photo error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const deliveryId = url.searchParams.get('deliveryId');

    if (!deliveryId) {
      return NextResponse.json({ error: 'Delivery ID is required' }, { status: 400 });
    }

    // const userId = session.user.id;
    // const user = await prisma.user.findUnique({
    //   where: { id: userId },
    //   select: { role: true }
    // });

    // Get delivery with permissions check
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: {
                product: {
                  include: {
                    seller: true
                  }
                }
              }
            }
          }
        },
        agent: true,
        deliveryPhotos: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = user?.role === 'ADMIN';
    const isDeliveryAgent = delivery.agentId === user.id;
    const isCustomer = delivery.order.customerId === user.id;
    const isSeller = delivery.order.items.some(item => item.product.sellerId === user.id);

    if (!isAdmin && !isDeliveryAgent && !isCustomer && !isSeller) {
      return NextResponse.json({ error: 'Not authorized to view these photos' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      photos: delivery.deliveryPhotos,
      delivery: {
        id: delivery.id,
        status: delivery.status,
        trackingId: delivery.trackingId,
        orderId: delivery.orderId
      }
    });

  } catch (error) {
    console.error('Get delivery photos error:', error);
    return NextResponse.json(
      { error: 'Failed to get photos' },
      { status: 500 }
    );
  }
}

async function sendDeliveryPhotoNotifications(delivery: any, photo: any, uploaderRole: string) {
  try {
    // Notify customer if delivery agent uploaded
    if (uploaderRole === 'DELIVERY_AGENT' && delivery.order.customerId !== photo.uploadedBy) {
      await createNotification({
        receiverId: delivery.order.customerId,
        senderId: photo.uploadedBy,
        orderId: delivery.orderId,
        type: 'EMAIL',
        title: 'Delivery Photo Uploaded',
        message: `Your delivery agent has uploaded a photo for order #${delivery.trackingId}. This helps ensure transparency in the delivery process.`
      });

      // Also send SMS notification
      await createNotification({
        receiverId: delivery.order.customerId,
        senderId: photo.uploadedBy,
        orderId: delivery.orderId,
        type: 'SMS',
        title: 'Delivery Photo Uploaded',
        message: `Your delivery agent uploaded a photo for order #${delivery.trackingId}. View it in your order details.`
      });
    }

    // Notify delivery agent if customer uploaded
    if (uploaderRole === 'CUSTOMER' && delivery.agentId && delivery.agentId !== photo.uploadedBy) {
      await createNotification({
        receiverId: delivery.agentId,
        senderId: photo.uploadedBy,
        orderId: delivery.orderId,
        type: 'EMAIL',
        title: 'Customer Uploaded Delivery Photo',
        message: `Customer has uploaded a photo for delivery #${delivery.trackingId}. This feedback helps us improve our service quality.`
      });

      // Also send SMS notification
      await createNotification({
        receiverId: delivery.agentId,
        senderId: photo.uploadedBy,
        orderId: delivery.orderId,
        type: 'SMS',
        title: 'Customer Photo Uploaded',
        message: `Customer uploaded a photo for delivery #${delivery.trackingId}. Check your dashboard for details.`
      });
    }

    // Notify sellers
    const sellerIds = [...new Set(delivery.order.items.map((item: any) => item.product.sellerId))] as string[];
    for (const sellerId of sellerIds) {
      if (sellerId !== photo.uploadedBy) {
        await createNotification({
          receiverId: sellerId,
          senderId: photo.uploadedBy,
          orderId: delivery.orderId,
          type: 'EMAIL',
          title: 'Delivery Photo Available',
          message: `A delivery photo has been uploaded for order #${delivery.trackingId}. This helps you monitor the quality of deliveries for your products.`
        });
      }
    }

    console.log(`Delivery photo notifications sent for delivery #${delivery.trackingId}`);

  } catch (error) {
    console.error('Error sending delivery photo notifications:', error);
    // Don't throw the error to avoid failing the photo upload
  }
}
