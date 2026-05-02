import * as XLSX from 'xlsx';

export type FarmImportTarget = 'egg_records' | 'feed_records' | 'mortality_records' | 'vaccinations';

export interface ParsedImportFile {
  headers: string[];
  rows: Record<string, string | number | null>[];
  totalRows: number;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value: unknown;
}

export interface ValidatedImportResult<T> {
  validRows: T[];
  errors: ImportValidationError[];
}

export interface ImportMapping {
  [key: string]: string;
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) {
    return null;
  }

  return asNumber;
}

function readMapped(row: Record<string, unknown>, mapping: ImportMapping, field: string): unknown {
  const sourceColumn = mapping[field] || field;
  return row[sourceColumn];
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedImportFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const headerRows = XLSX.utils.sheet_to_json<(string | null)[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const headers = (headerRows[0] || [])
    .map((cell) => (cell || '').toString().trim())
    .filter((value) => Boolean(value));

  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(worksheet, {
    defval: null,
    raw: false,
  });

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

export function validateImportRows(
  target: FarmImportTarget,
  rows: Record<string, unknown>[],
  mapping: ImportMapping
): ValidatedImportResult<Record<string, unknown>> {
  const errors: ImportValidationError[] = [];
  const validRows: Record<string, unknown>[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (target === 'egg_records') {
      const recordedOn = toDate(readMapped(row, mapping, 'recordedOn'));
      const quantity = toNumber(readMapped(row, mapping, 'quantity'));
      const damagedCount = toNumber(readMapped(row, mapping, 'damagedCount')) || 0;
      const flockName = readMapped(row, mapping, 'flockName');
      const notes = readMapped(row, mapping, 'notes');

      if (!recordedOn) {
        errors.push({ row: rowNumber, field: 'recordedOn', message: 'Invalid or missing date', value: readMapped(row, mapping, 'recordedOn') });
      }
      if (quantity === null || quantity < 0) {
        errors.push({ row: rowNumber, field: 'quantity', message: 'Quantity must be a positive number', value: readMapped(row, mapping, 'quantity') });
      }
      if (damagedCount < 0) {
        errors.push({ row: rowNumber, field: 'damagedCount', message: 'Damaged count cannot be negative', value: readMapped(row, mapping, 'damagedCount') });
      }

      if (recordedOn && quantity !== null && quantity >= 0 && damagedCount >= 0) {
        validRows.push({
          recordedOn,
          quantity: Math.floor(quantity),
          damagedCount: Math.floor(damagedCount),
          flockName: flockName ? String(flockName).trim() : null,
          notes: notes ? String(notes).trim() : null,
        });
      }

      return;
    }

    if (target === 'feed_records') {
      const recordedOn = toDate(readMapped(row, mapping, 'recordedOn'));
      const feedType = readMapped(row, mapping, 'feedType');
      const quantityKg = toNumber(readMapped(row, mapping, 'quantityKg'));
      const cost = toNumber(readMapped(row, mapping, 'cost'));
      const flockName = readMapped(row, mapping, 'flockName');
      const notes = readMapped(row, mapping, 'notes');

      if (!recordedOn) {
        errors.push({ row: rowNumber, field: 'recordedOn', message: 'Invalid or missing date', value: readMapped(row, mapping, 'recordedOn') });
      }
      if (!feedType || String(feedType).trim().length === 0) {
        errors.push({ row: rowNumber, field: 'feedType', message: 'Feed type is required', value: feedType });
      }
      if (quantityKg === null || quantityKg < 0) {
        errors.push({ row: rowNumber, field: 'quantityKg', message: 'Quantity must be a positive number', value: readMapped(row, mapping, 'quantityKg') });
      }
      if (cost !== null && cost < 0) {
        errors.push({ row: rowNumber, field: 'cost', message: 'Cost cannot be negative', value: readMapped(row, mapping, 'cost') });
      }

      if (recordedOn && feedType && quantityKg !== null && quantityKg >= 0 && (cost === null || cost >= 0)) {
        validRows.push({
          recordedOn,
          feedType: String(feedType).trim(),
          quantityKg,
          cost,
          flockName: flockName ? String(flockName).trim() : null,
          notes: notes ? String(notes).trim() : null,
        });
      }

      return;
    }

    if (target === 'mortality_records') {
      const recordedOn = toDate(readMapped(row, mapping, 'recordedOn'));
      const count = toNumber(readMapped(row, mapping, 'count'));
      const cause = readMapped(row, mapping, 'cause');
      const flockName = readMapped(row, mapping, 'flockName');
      const notes = readMapped(row, mapping, 'notes');

      if (!recordedOn) {
        errors.push({ row: rowNumber, field: 'recordedOn', message: 'Invalid or missing date', value: readMapped(row, mapping, 'recordedOn') });
      }
      if (count === null || count < 0) {
        errors.push({ row: rowNumber, field: 'count', message: 'Count must be a positive number', value: readMapped(row, mapping, 'count') });
      }

      if (recordedOn && count !== null && count >= 0) {
        validRows.push({
          recordedOn,
          count: Math.floor(count),
          cause: cause ? String(cause).trim() : null,
          flockName: flockName ? String(flockName).trim() : null,
          notes: notes ? String(notes).trim() : null,
        });
      }

      return;
    }

    const vaccineName = readMapped(row, mapping, 'vaccineName');
    const scheduledDate = toDate(readMapped(row, mapping, 'scheduledDate'));
    const administeredDate = toDate(readMapped(row, mapping, 'administeredDate'));
    const statusRaw = readMapped(row, mapping, 'status');
    const flockName = readMapped(row, mapping, 'flockName');
    const notes = readMapped(row, mapping, 'notes');

    const status = statusRaw ? String(statusRaw).trim().toUpperCase() : 'SCHEDULED';
    const statusAllowed = ['SCHEDULED', 'COMPLETED', 'MISSED'].includes(status);

    if (!vaccineName || String(vaccineName).trim().length === 0) {
      errors.push({ row: rowNumber, field: 'vaccineName', message: 'Vaccine name is required', value: vaccineName });
    }
    if (!scheduledDate) {
      errors.push({ row: rowNumber, field: 'scheduledDate', message: 'Invalid or missing scheduled date', value: readMapped(row, mapping, 'scheduledDate') });
    }
    if (statusRaw && !statusAllowed) {
      errors.push({ row: rowNumber, field: 'status', message: 'Status must be SCHEDULED, COMPLETED, or MISSED', value: statusRaw });
    }

    if (vaccineName && scheduledDate && statusAllowed) {
      validRows.push({
        vaccineName: String(vaccineName).trim(),
        scheduledDate,
        administeredDate,
        status,
        flockName: flockName ? String(flockName).trim() : null,
        notes: notes ? String(notes).trim() : null,
      });
    }
  });

  return { validRows, errors };
}
