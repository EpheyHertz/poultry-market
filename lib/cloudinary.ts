
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(file: File, folder: string = 'poultry-marketplace'): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error('Failed to upload to Cloudinary'));
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error('Failed to process file for upload');
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete from Cloudinary');
  }
}

export function getPublicIdFromUrl(url: string): string {
  const matches = url.match(/\/([^/]+)\.[^.]+$/);
  return matches ? matches[1] : '';
}

export interface SignedUploadPayload {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId: string;
  timestamp: number;
  signature: string;
  resourceType: 'auto';
}

function randomSuffix(length: number = 8): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

export function generateSignedUploadPayload(options?: {
  folder?: string;
  publicId?: string;
  timestamp?: number;
}): SignedUploadPayload {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are not fully configured');
  }

  const folder = options?.folder || 'poultry-marketplace/attachments';
  const timestamp = options?.timestamp || Math.floor(Date.now() / 1000);
  const publicId = options?.publicId || `attachment-${Date.now()}-${randomSuffix()}`;

  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    cloudName,
    apiKey,
    folder,
    publicId,
    timestamp,
    signature,
    resourceType: 'auto',
  };
}
