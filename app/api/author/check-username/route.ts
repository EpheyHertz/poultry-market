import { NextRequest, NextResponse } from 'next/server';
import { validateUsername, isUsernameAvailable } from '@/lib/author';
import { getCurrentUser } from '@/lib/auth';

// POST - Check if username is available
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { username } = body;
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    // Validate format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        valid: false,
        error: validation.error
      });
    }
    
    // Check availability (exclude current user)
    const available = await isUsernameAvailable(username, user.id);
    
    return NextResponse.json({
      available,
      valid: true,
      username: username.toLowerCase()
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username' },
      { status: 500 }
    );
  }
}
