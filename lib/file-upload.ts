import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { NextRequest } from 'next/server'
import { uploadToCloudinary } from './cloudinary'

// Check if Cloudinary is configured
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  try {
    // Use Cloudinary if configured
    if (useCloudinary) {
      return await uploadToCloudinary(file, folder)
    }

    // Fallback to local storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', folder)
    await mkdir(uploadDir, { recursive: true })
    
    // Write file
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, new Uint8Array(buffer))
    
    // Return public URL
    return `/${folder}/${filename}`
  } catch (error) {
    console.error('File upload error:', error)
    throw new Error('Failed to upload file')
  }
}

export async function handleFileUpload(request: NextRequest, fieldName: string = 'file') {
  try {
    const formData = await request.formData()
    const file = formData.get(fieldName) as File
    const folder = formData.get('folder') as string || 'uploads'
    
    if (!file) {
      throw new Error('No file provided')
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF')
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 5MB')
    }
    
    return await uploadFile(file, folder)
  } catch (error) {
    console.error('File upload handling error:', error)
    throw error
  }
}