import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Context {
  params: Promise<{ jobId: string }>;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function GET(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;

    const job = await prisma.farmImportJob.findFirst({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    const payload = parseJson<{
      dataset: string;
      headers: string[];
      previewRows: Array<Record<string, unknown>>;
      suggestedMapping: Record<string, string>;
    }>(job.previewPayload);

    return NextResponse.json({
      job: {
        ...job,
        mapping: parseJson(job.mapping),
        errorLog: parseJson(job.errorLog),
      },
      payload,
    });
  } catch (error) {
    console.error('Import job GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch import job' }, { status: 500 });
  }
}
