import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { NextRequest } from 'next/server'

export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  try {
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
    
    if (!file) {
      throw new Error('No file provided')
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type')
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large')
    }
    
    const folder = file.type.startsWith('image/') ? 'images' : 'documents'
    return await uploadFile(file, folder)
  } catch (error) {
    console.error('File upload handling error:', error)
    throw error
  }
}