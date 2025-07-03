import QRCode from 'qrcode'

export async function generateQRCode(text: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('QR Code generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}

export async function generateDashboardQR(userId: string, dashboardSlug: string): Promise<string> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/store/${dashboardSlug}`
  return await generateQRCode(dashboardUrl)
}