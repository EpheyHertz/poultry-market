
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, size = 256, errorCorrectionLevel = 'M' } = await request.json()

    if (!data) {
      return NextResponse.json({ error: 'Data is required' }, { status: 400 })
    }

    // Use Google Charts API to generate QR code
    const qrUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(data)}&choe=UTF-8&chld=${errorCorrectionLevel}|0`

    // Fetch the QR code image
    const response = await fetch(qrUrl)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
    }

    const imageBuffer = await response.arrayBuffer()
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('QR code generation error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
