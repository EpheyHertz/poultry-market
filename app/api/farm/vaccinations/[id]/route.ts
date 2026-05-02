import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { vaccinationUpdateSchema } from '@/modules/eggs/schemas';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const vaccination = await prisma.vaccination.findFirst({
      where: { id, userId: user.id },
      include: {
        flock: {
          select: { id: true, name: true },
        },
        attachments: true,
      },
    });

    if (!vaccination) {
      return NextResponse.json({ error: 'Vaccination record not found' }, { status: 404 });
    }

    return NextResponse.json({ vaccination });
  } catch (error) {
    console.error('Vaccination GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch vaccination record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = vaccinationUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.flockId) {
      const flock = await prisma.flock.findFirst({
        where: { id: parsed.data.flockId, userId: user.id },
      });

      if (!flock) {
        return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
      }
    }

    const existing = await prisma.vaccination.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Vaccination record not found' }, { status: 404 });
    }

    const vaccination = await prisma.vaccination.update({
      where: { id },
      data: {
        ...(parsed.data.flockId !== undefined ? { flockId: parsed.data.flockId || null } : {}),
        ...(parsed.data.vaccineName !== undefined ? { vaccineName: parsed.data.vaccineName } : {}),
        ...(parsed.data.scheduledDate ? { scheduledDate: new Date(parsed.data.scheduledDate) } : {}),
        ...(parsed.data.administeredDate !== undefined
          ? { administeredDate: parsed.data.administeredDate ? new Date(parsed.data.administeredDate) : null }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      },
      include: {
        flock: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ vaccination });
  } catch (error) {
    console.error('Vaccination PUT error:', error);
    return NextResponse.json({ error: 'Failed to update vaccination record' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await prisma.vaccination.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Vaccination record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vaccination DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete vaccination record' }, { status: 500 });
  }
}
