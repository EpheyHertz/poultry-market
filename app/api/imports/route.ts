import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  applyFarmImport,
  parseImportFile,
  suggestMapping,
  validateMappedRows,
  type ColumnMapping,
  type FarmImportDataset,
} from '@/modules/imports/service';
import {
  assertFeatureAccess,
  type FeatureAccessError,
  toFeatureDeniedResponsePayload,
} from '@/modules/subscriptions';

const DATASETS: FarmImportDataset[] = [
  'egg_records',
  'feed_records',
  'mortality_records',
  'vaccinations',
  'flocks',
];

const confirmSchema = z.object({
  jobId: z.string().min(1),
  dataset: z.enum(['egg_records', 'feed_records', 'mortality_records', 'vaccinations', 'flocks']).optional(),
  mapping: z.record(z.string(), z.string()),
  skipInvalid: z.boolean().optional().default(true),
});

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

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await prisma.farmImportJob.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        ...job,
        mapping: parseJson(job.mapping),
        errorLog: parseJson(job.errorLog),
      })),
    });
  } catch (error) {
    console.error('Farm imports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch import jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // let access;
    // try {
    //   access = await assertFeatureAccess(user.id, 'import_data');
    // } catch (error) {
    //   const featureError = error as FeatureAccessError;
    //   return NextResponse.json(toFeatureDeniedResponsePayload(featureError.details), {
    //     status: featureError.statusCode || 403,
    //   });
    // }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const datasetRaw = String(formData.get('dataset') || 'egg_records') as FarmImportDataset;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!DATASETS.includes(datasetRaw)) {
      return NextResponse.json({ error: 'Unsupported import dataset' }, { status: 400 });
    }

    const preview = await parseImportFile(file);

    if (preview.totalRows === 0) {
      return NextResponse.json({ error: 'Uploaded file has no data rows' }, { status: 400 });
    }

    // if (preview.totalRows > access.limits.maxImportRowsPerFile) {
    //   return NextResponse.json(
    //     {
    //       error: `Your plan supports up to ${access.limits.maxImportRowsPerFile} rows per import file`,
    //       limit: access.limits.maxImportRowsPerFile,
    //     },
    //     { status: 403 }
    //   );
    // }

    const suggestedMapping = suggestMapping(datasetRaw, preview.headers);
    const validation = validateMappedRows(datasetRaw, preview.allRows, suggestedMapping);

    const job = await prisma.farmImportJob.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        status: 'PREVIEW',
        totalRows: preview.totalRows,
        validRows: validation.validRows.length,
        invalidRows: validation.errors.length,
        previewPayload: JSON.stringify({
          dataset: datasetRaw,
          headers: preview.headers,
          allRows: preview.allRows,
          previewRows: preview.previewRows,
          suggestedMapping,
        }),
        errorLog: JSON.stringify(validation.errors.slice(0, 500)),
      },
    });

    return NextResponse.json({
      jobId: job.id,
      dataset: datasetRaw,
      headers: preview.headers,
      previewRows: preview.previewRows,
      suggestedMapping,
      totalRows: preview.totalRows,
      validation: {
        validRows: validation.validRows.length,
        invalidRows: validation.errors.length,
        errors: validation.errors.slice(0, 100),
      },
      requiresConfirmation: true,
    });
  } catch (error) {
    console.error('Farm imports POST preview error:', error);
    return NextResponse.json({ error: 'Failed to parse import file' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await assertFeatureAccess(user.id, 'import_data');
    } catch (error) {
      const featureError = error as FeatureAccessError;
      return NextResponse.json(toFeatureDeniedResponsePayload(featureError.details), {
        status: featureError.statusCode || 403,
      });
    }

    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const job = await prisma.farmImportJob.findFirst({
      where: {
        id: parsed.data.jobId,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    const payload = parseJson<{
      dataset: FarmImportDataset;
      allRows: Array<Record<string, unknown>>;
    }>(job.previewPayload);

    if (!payload) {
      return NextResponse.json({ error: 'Import preview payload is missing or invalid' }, { status: 400 });
    }

    const dataset = parsed.data.dataset || payload.dataset;
    const mapping = parsed.data.mapping as ColumnMapping;

    const validation = validateMappedRows(dataset, payload.allRows, mapping);

    if (validation.errors.length > 0 && !parsed.data.skipInvalid) {
      return NextResponse.json(
        {
          error: 'Validation failed. Fix row errors before importing.',
          validation: {
            validRows: validation.validRows.length,
            invalidRows: validation.errors.length,
            errors: validation.errors,
          },
        },
        { status: 422 }
      );
    }

    const rowsToImport = validation.validRows;

    if (rowsToImport.length === 0) {
      await prisma.farmImportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          mapping: JSON.stringify(mapping),
          validRows: 0,
          invalidRows: validation.errors.length,
          errorLog: JSON.stringify(validation.errors.slice(0, 500)),
        },
      });

      return NextResponse.json(
        {
          error: 'No valid rows to import',
          validation: {
            validRows: 0,
            invalidRows: validation.errors.length,
            errors: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const result = await applyFarmImport(user.id, dataset, rowsToImport);

    await prisma.farmImportJob.update({
      where: { id: job.id },
      data: {
        status: 'CONFIRMED',
        mapping: JSON.stringify(mapping),
        validRows: validation.validRows.length,
        invalidRows: validation.errors.length,
        errorLog: JSON.stringify(validation.errors.slice(0, 500)),
        confirmedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      dataset,
      inserted: result.inserted,
      updated: result.updated,
      validation: {
        validRows: validation.validRows.length,
        invalidRows: validation.errors.length,
        errors: validation.errors.slice(0, 100),
      },
    });
  } catch (error) {
    console.error('Farm imports PUT confirm error:', error);
    return NextResponse.json({ error: 'Failed to confirm import' }, { status: 500 });
  }
}
