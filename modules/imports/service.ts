import * as XLSX from 'xlsx';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type FarmImportDataset =
  | 'egg_records'
  | 'feed_records'
  | 'mortality_records'
  | 'vaccinations'
  | 'flocks';

export interface ImportPreviewResult {
  headers: string[];
  totalRows: number;
  previewRows: Array<Record<string, unknown>>;
  allRows: Array<Record<string, unknown>>;
}

export type ColumnMapping = Record<string, string>;

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  rawValue?: unknown;
}

export interface ImportValidationResult {
  validRows: any[];
  errors: ImportValidationError[];
}

const DATASET_REQUIRED_FIELDS: Record<FarmImportDataset, string[]> = {
  egg_records: ['recordedOn', 'quantity'],
  feed_records: ['recordedOn', 'feedType', 'quantityKg'],
  mortality_records: ['recordedOn', 'count'],
  vaccinations: ['vaccineName', 'scheduledDate'],
  flocks: ['name'],
};

const HEADER_ALIASES: Record<string, string[]> = {
  recordedOn: ['date', 'recorded_on', 'recordedon', 'day', 'record date'],
  quantity: ['eggs', 'count', 'total_eggs', 'total eggs', 'quantity'],
  damagedCount: ['damaged', 'broken', 'damaged eggs', 'damaged_count'],
  notes: ['notes', 'comment', 'remarks'],
  flockName: ['flock', 'flock_name', 'house', 'batch'],
  feedType: ['feed', 'feed_type', 'feed type'],
  quantityKg: ['kg', 'quantity_kg', 'feed_kg', 'feed kg'],
  cost: ['cost', 'amount', 'price'],
  count: ['count', 'deaths', 'mortality', 'dead birds'],
  cause: ['cause', 'reason', 'mortality cause'],
  vaccineName: ['vaccine', 'vaccine_name', 'vaccine name'],
  scheduledDate: ['scheduled_date', 'schedule date', 'due_date', 'due date'],
  administeredDate: ['administered_date', 'administered date', 'completed_date', 'completed date'],
  status: ['status', 'state'],
  name: ['name', 'flock_name', 'flock name'],
  breed: ['breed', 'type'],
  birdCount: ['bird_count', 'bird count', 'birds', 'total birds'],
  acquiredAt: ['acquired_at', 'acquired date', 'start_date', 'start date'],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function parseDate(value: unknown): Date | null {
  if (isEmptyValue(value)) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const asString = String(value).trim();
  const date = new Date(asString);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const asNumber = Number(asString);
  if (!Number.isNaN(asNumber) && asNumber > 20000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const converted = new Date(excelEpoch.getTime() + asNumber * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(converted.getTime())) {
      return converted;
    }
  }

  return null;
}

function parseNumber(value: unknown): number | null {
  if (isEmptyValue(value)) return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function extractMappedValue(row: Record<string, unknown>, mapping: ColumnMapping, field: string): unknown {
  const header = mapping[field];
  if (!header) return undefined;
  return row[header];
}

export function suggestMapping(dataset: FarmImportDataset, headers: string[]): ColumnMapping {
  const normalizedByOriginal = new Map<string, string>(
    headers.map((header) => [header, normalizeHeader(header)]),
  );

  const mapping: ColumnMapping = {};
  const requiredFields = DATASET_REQUIRED_FIELDS[dataset];

  const optionalFields = Object.keys(HEADER_ALIASES).filter((field) => !requiredFields.includes(field));

  const candidateFields = [...requiredFields, ...optionalFields];

  for (const field of candidateFields) {
    const aliases = HEADER_ALIASES[field] || [field];

    const match = headers.find((header) => {
      const normalized = normalizedByOriginal.get(header) || normalizeHeader(header);
      return aliases.some((alias) => normalizeHeader(alias) === normalized);
    });

    if (match) {
      mapping[field] = match;
    }
  }

  return mapping;
}

export async function parseImportFile(file: File): Promise<ImportPreviewResult> {
  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded workbook has no sheets');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    headers,
    totalRows: rows.length,
    previewRows: rows.slice(0, 20),
    allRows: rows,
  };
}

function parseVaccinationStatus(value: unknown): 'SCHEDULED' | 'COMPLETED' | 'MISSED' | null {
  if (isEmptyValue(value)) return 'SCHEDULED';
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'SCHEDULED' || normalized === 'COMPLETED' || normalized === 'MISSED') {
    return normalized;
  }

  if (normalized === 'DONE') return 'COMPLETED';
  if (normalized === 'PENDING') return 'SCHEDULED';
  return null;
}

function parseFlockStatus(value: unknown): 'ACTIVE' | 'ARCHIVED' | null {
  if (isEmptyValue(value)) return 'ACTIVE';
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'ARCHIVED') {
    return normalized;
  }

  if (normalized === 'INACTIVE') return 'ARCHIVED';
  return null;
}

export function validateMappedRows(
  dataset: FarmImportDataset,
  rows: Array<Record<string, unknown>>,
  mapping: ColumnMapping,
): ImportValidationResult {
  const errors: ImportValidationError[] = [];
  const validRows: any[] = [];

  const requiredFields = DATASET_REQUIRED_FIELDS[dataset];

  for (const field of requiredFields) {
    if (!mapping[field]) {
      errors.push({
        row: 1,
        field,
        message: `Missing required mapping for field: ${field}`,
      });
    }
  }

  if (errors.length > 0) {
    return { errors, validRows };
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (dataset === 'egg_records') {
      const recordedOn = parseDate(extractMappedValue(row, mapping, 'recordedOn'));
      const quantity = parseNumber(extractMappedValue(row, mapping, 'quantity'));
      const damagedCount = parseNumber(extractMappedValue(row, mapping, 'damagedCount')) || 0;
      const notes = extractMappedValue(row, mapping, 'notes');
      const flockName = extractMappedValue(row, mapping, 'flockName');

      if (!recordedOn) {
        errors.push({ row: rowNumber, field: 'recordedOn', message: 'Invalid or missing date' });
      }

      if (quantity === null || quantity <= 0) {
        errors.push({ row: rowNumber, field: 'quantity', message: 'Quantity must be a positive number' });
      }

      if (damagedCount < 0) {
        errors.push({ row: rowNumber, field: 'damagedCount', message: 'Damaged count cannot be negative' });
      }

      if (recordedOn && quantity !== null && quantity > 0 && damagedCount >= 0) {
        validRows.push({
          recordedOn,
          quantity: Math.round(quantity),
          damagedCount: Math.round(damagedCount),
          notes: isEmptyValue(notes) ? null : String(notes),
          flockName: isEmptyValue(flockName) ? null : String(flockName).trim(),
        });
      }
      return;
    }

    if (dataset === 'feed_records') {
      const recordedOn = parseDate(extractMappedValue(row, mapping, 'recordedOn'));
      const feedType = extractMappedValue(row, mapping, 'feedType');
      const quantityKg = parseNumber(extractMappedValue(row, mapping, 'quantityKg'));
      const cost = parseNumber(extractMappedValue(row, mapping, 'cost'));
      const notes = extractMappedValue(row, mapping, 'notes');
      const flockName = extractMappedValue(row, mapping, 'flockName');

      if (!recordedOn) {
        errors.push({ row: rowNumber, field: 'recordedOn', message: 'Invalid or missing date' });
      }

      if (isEmptyValue(feedType)) {
        errors.push({ row: rowNumber, field: 'feedType', message: 'Feed type is required' });
      }

      if (quantityKg === null || quantityKg <= 0) {
        errors.push({ row: rowNumber, field: 'quantityKg', message: 'Quantity (kg) must be a positive number' });
      }

      if (cost !== null && cost < 0) {
        errors.push({ row: rowNumber, field: 'cost', message: 'Cost cannot be negative' });
      }

      if (recordedOn && !isEmptyValue(feedType) && quantityKg !== null && quantityKg > 0) {
        validRows.push({
          recordedOn,
          feedType: String(feedType).trim(),
          quantityKg,
          cost,
          notes: isEmptyValue(notes) ? null : String(notes),
          flockName: isEmptyValue(flockName) ? null : String(flockName).trim(),
        });
      }
      return;
    }

    if (dataset === 'mortality_records') {
      const recordedOn = parseDate(extractMappedValue(row, mapping, 'recordedOn'));
      const count = parseNumber(extractMappedValue(row, mapping, 'count'));
      const cause = extractMappedValue(row, mapping, 'cause');
      const notes = extractMappedValue(row, mapping, 'notes');
      const flockName = extractMappedValue(row, mapping, 'flockName');

      if (!recordedOn) {
        errors.push({ row: rowNumber, field: 'recordedOn', message: 'Invalid or missing date' });
      }

      if (count === null || count <= 0) {
        errors.push({ row: rowNumber, field: 'count', message: 'Count must be a positive number' });
      }

      if (recordedOn && count !== null && count > 0) {
        validRows.push({
          recordedOn,
          count: Math.round(count),
          cause: isEmptyValue(cause) ? null : String(cause),
          notes: isEmptyValue(notes) ? null : String(notes),
          flockName: isEmptyValue(flockName) ? null : String(flockName).trim(),
        });
      }
      return;
    }

    if (dataset === 'vaccinations') {
      const vaccineName = extractMappedValue(row, mapping, 'vaccineName');
      const scheduledDate = parseDate(extractMappedValue(row, mapping, 'scheduledDate'));
      const administeredDate = parseDate(extractMappedValue(row, mapping, 'administeredDate'));
      const status = parseVaccinationStatus(extractMappedValue(row, mapping, 'status'));
      const notes = extractMappedValue(row, mapping, 'notes');
      const flockName = extractMappedValue(row, mapping, 'flockName');

      if (isEmptyValue(vaccineName)) {
        errors.push({ row: rowNumber, field: 'vaccineName', message: 'Vaccine name is required' });
      }

      if (!scheduledDate) {
        errors.push({ row: rowNumber, field: 'scheduledDate', message: 'Invalid or missing scheduled date' });
      }

      if (!status) {
        errors.push({ row: rowNumber, field: 'status', message: 'Status must be SCHEDULED, COMPLETED, or MISSED' });
      }

      if (!isEmptyValue(extractMappedValue(row, mapping, 'administeredDate')) && !administeredDate) {
        errors.push({ row: rowNumber, field: 'administeredDate', message: 'Invalid administered date' });
      }

      if (!isEmptyValue(vaccineName) && scheduledDate && status) {
        validRows.push({
          vaccineName: String(vaccineName).trim(),
          scheduledDate,
          administeredDate,
          status,
          notes: isEmptyValue(notes) ? null : String(notes),
          flockName: isEmptyValue(flockName) ? null : String(flockName).trim(),
        });
      }
      return;
    }

    if (dataset === 'flocks') {
      const name = extractMappedValue(row, mapping, 'name');
      const breed = extractMappedValue(row, mapping, 'breed');
      const birdCount = parseNumber(extractMappedValue(row, mapping, 'birdCount')) || 0;
      const acquiredAt = parseDate(extractMappedValue(row, mapping, 'acquiredAt'));
      const status = parseFlockStatus(extractMappedValue(row, mapping, 'status'));
      const notes = extractMappedValue(row, mapping, 'notes');

      if (isEmptyValue(name)) {
        errors.push({ row: rowNumber, field: 'name', message: 'Flock name is required' });
      }

      if (birdCount < 0) {
        errors.push({ row: rowNumber, field: 'birdCount', message: 'Bird count cannot be negative' });
      }

      if (!status) {
        errors.push({ row: rowNumber, field: 'status', message: 'Status must be ACTIVE or ARCHIVED' });
      }

      if (!isEmptyValue(extractMappedValue(row, mapping, 'acquiredAt')) && !acquiredAt) {
        errors.push({ row: rowNumber, field: 'acquiredAt', message: 'Invalid acquired date' });
      }

      if (!isEmptyValue(name) && birdCount >= 0 && status) {
        validRows.push({
          name: String(name).trim(),
          breed: isEmptyValue(breed) ? null : String(breed),
          birdCount: Math.round(birdCount),
          acquiredAt,
          status,
          notes: isEmptyValue(notes) ? null : String(notes),
        });
      }
    }
  });

  return { validRows, errors };
}

async function resolveFlockId(
  tx: Prisma.TransactionClient,
  userId: string,
  flockName: string | null,
): Promise<string | null> {
  if (!flockName) return null;

  const trimmed = flockName.trim();
  if (!trimmed) return null;

  const existing = await tx.flock.findFirst({
    where: {
      userId,
      name: trimmed,
    },
  });

  if (existing) {
    return existing.id;
  }

  const created = await tx.flock.create({
    data: {
      userId,
      name: trimmed,
      status: 'ACTIVE',
    },
  });

  return created.id;
}

export async function applyFarmImport(
  userId: string,
  dataset: FarmImportDataset,
  rows: any[],
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    if (dataset === 'egg_records') {
      for (const row of rows) {
        const flockId = await resolveFlockId(tx, userId, row.flockName || null);
        await tx.eggRecord.create({
          data: {
            userId,
            flockId,
            recordedOn: row.recordedOn,
            quantity: row.quantity,
            damagedCount: row.damagedCount || 0,
            notes: row.notes || null,
          },
        });
        inserted += 1;
      }
      return;
    }

    if (dataset === 'feed_records') {
      for (const row of rows) {
        const flockId = await resolveFlockId(tx, userId, row.flockName || null);
        await tx.feedRecord.create({
          data: {
            userId,
            flockId,
            recordedOn: row.recordedOn,
            feedType: row.feedType,
            quantityKg: row.quantityKg,
            cost: row.cost,
            notes: row.notes || null,
          },
        });
        inserted += 1;
      }
      return;
    }

    if (dataset === 'mortality_records') {
      for (const row of rows) {
        const flockId = await resolveFlockId(tx, userId, row.flockName || null);
        await tx.mortalityRecord.create({
          data: {
            userId,
            flockId,
            recordedOn: row.recordedOn,
            count: row.count,
            cause: row.cause || null,
            notes: row.notes || null,
          },
        });
        inserted += 1;
      }
      return;
    }

    if (dataset === 'vaccinations') {
      for (const row of rows) {
        const flockId = await resolveFlockId(tx, userId, row.flockName || null);
        await tx.vaccination.create({
          data: {
            userId,
            flockId,
            vaccineName: row.vaccineName,
            scheduledDate: row.scheduledDate,
            administeredDate: row.administeredDate || null,
            status: row.status,
            notes: row.notes || null,
          },
        });
        inserted += 1;
      }
      return;
    }

    if (dataset === 'flocks') {
      for (const row of rows) {
        const existing = await tx.flock.findFirst({
          where: {
            userId,
            name: row.name,
          },
        });

        if (existing) {
          await tx.flock.update({
            where: { id: existing.id },
            data: {
              breed: row.breed,
              birdCount: row.birdCount,
              acquiredAt: row.acquiredAt,
              status: row.status,
              notes: row.notes,
            },
          });
          updated += 1;
        } else {
          await tx.flock.create({
            data: {
              userId,
              name: row.name,
              breed: row.breed,
              birdCount: row.birdCount,
              acquiredAt: row.acquiredAt,
              status: row.status,
              notes: row.notes,
            },
          });
          inserted += 1;
        }
      }
    }
  });

  return { inserted, updated };
}
