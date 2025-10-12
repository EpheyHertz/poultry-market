import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getInvoiceStats, cleanupExpiredInvoices } from '@/lib/payment-invoices';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Only allow admin users to access invoice stats
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 401 });
    }

    const stats = await getInvoiceStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Invoice stats error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invoice stats'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Only allow admin users to cleanup invoices
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'cleanup') {
      const result = await cleanupExpiredInvoices();
      const stats = await getInvoiceStats();
      
      return NextResponse.json({
        success: true,
        message: `Marked ${result.count} invoices as expired`,
        data: {
          cleanedUp: result.count,
          currentStats: stats
        }
      });
    }

    return NextResponse.json({
      error: 'Invalid action. Supported actions: cleanup'
    }, { status: 400 });

  } catch (error) {
    console.error('Invoice cleanup error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup invoices'
    }, { status: 500 });
  }
}