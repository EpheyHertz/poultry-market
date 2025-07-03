import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { handleFileUpload } from '@/lib/file-upload'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fileUrl = await handleFileUpload(request)
    
    return NextResponse.json({ 
      success: true, 
      url: fileUrl 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 400 })
  }
}