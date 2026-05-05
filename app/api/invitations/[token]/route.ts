import { NextRequest, NextResponse } from 'next/server';
import { findInvitationByToken } from '@/modules/farms/service';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invitation = await findInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or expired' }, { status: 404 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        farmId: invitation.farmId,
        farmName: invitation.farm.name,
        role: invitation.role,
        invitedEmail: invitation.invitedEmail,
        invitedBy: invitation.invitedBy,
        invitationExpiresAt: invitation.invitationExpiresAt,
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error('Invitation validation GET error:', error);
    return NextResponse.json({ error: 'Failed to validate invitation' }, { status: 500 });
  }
}
