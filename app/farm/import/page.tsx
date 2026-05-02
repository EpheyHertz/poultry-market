 'use client';

// import Link from 'next/link';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { ThemeToggleLarge } from '@/components/theme/theme-toggle';

// export default function ImportPage() {
//   return (
//     <main className="mx-auto w-full max-w-4xl p-4 sm:p-6">
//       <div className="flex items-center justify-between mb-4">
//         <h1 className="text-2xl font-semibold">Import Data</h1>
//         <ThemeToggleLarge />
//       </div>

//       <Card className="bg-card">
//         <CardHeader>
//           <CardTitle>Import Wizard (placeholder)</CardTitle>
//           <CardDescription>Upload CSV/XLSX, map columns, preview and confirm import.</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <p className="text-sm text-muted-foreground mb-4">This page will host the multi-step import wizard. For now you can upload a file and preview rows.</p>
//           <div className="flex gap-2">
//             <input type="file" accept=".csv, .xlsx, .xls" className="rounded-2xl bg-input p-2" />
//             <Button variant="primary">Upload</Button>
//             <Link href="/farm/records"><Button variant="ghost">Manage Records</Button></Link>
//           </div>
//         </CardContent>
//       </Card>
//     </main>
//   );
// }


import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DATASET_OPTIONS = [
  { value: 'egg_records', label: 'Egg Records' },
  { value: 'feed_records', label: 'Feed Records' },
  { value: 'mortality_records', label: 'Mortality Records' },
  { value: 'vaccinations', label: 'Vaccinations' },
  { value: 'flocks', label: 'Flocks' },
] as const;

type Dataset = (typeof DATASET_OPTIONS)[number]['value'];

const DATASET_FIELDS: Record<Dataset, Array<{ key: string; label: string; required: boolean }>> = {
  egg_records: [
    { key: 'recordedOn', label: 'Recorded Date', required: true },
    { key: 'quantity', label: 'Egg Quantity', required: true },
    { key: 'damagedCount', label: 'Damaged Count', required: false },
    { key: 'flockName', label: 'Flock Name', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
  feed_records: [
    { key: 'recordedOn', label: 'Recorded Date', required: true },
    { key: 'feedType', label: 'Feed Type', required: true },
    { key: 'quantityKg', label: 'Quantity (Kg)', required: true },
    { key: 'cost', label: 'Cost', required: false },
    { key: 'flockName', label: 'Flock Name', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
  mortality_records: [
    { key: 'recordedOn', label: 'Recorded Date', required: true },
    { key: 'count', label: 'Mortality Count', required: true },
    { key: 'cause', label: 'Cause', required: false },
    { key: 'flockName', label: 'Flock Name', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
  vaccinations: [
    { key: 'vaccineName', label: 'Vaccine Name', required: true },
    { key: 'scheduledDate', label: 'Scheduled Date', required: true },
    { key: 'administeredDate', label: 'Administered Date', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'flockName', label: 'Flock Name', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
  flocks: [
    { key: 'name', label: 'Flock Name', required: true },
    { key: 'breed', label: 'Breed', required: false },
    { key: 'birdCount', label: 'Bird Count', required: false },
    { key: 'acquiredAt', label: 'Acquired Date', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
};

type PreviewResponse = {
  jobId: string;
  dataset: Dataset;
  headers: string[];
  previewRows: Array<Record<string, unknown>>;
  suggestedMapping: Record<string, string>;
  totalRows: number;
  validation: {
    validRows: number;
    invalidRows: number;
    errors: Array<{ row: number; field: string; message: string }>;
  };
};

export default function FarmImportPage() {
  const [dataset, setDataset] = useState<Dataset>('egg_records');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<null | {
    inserted: number;
    updated: number;
    invalidRows: number;
  }>(null);

  const datasetFields = useMemo(() => DATASET_FIELDS[dataset], [dataset]);

  function updateMapping(field: string, header: string) {
    setMapping((current) => {
      if (header === '__none__') {
        const next = { ...current };
        delete next[field];
        return next;
      }
      return {
        ...current,
        [field]: header,
      };
    });
  }

  async function handlePreviewUpload() {
    if (!file) {
      toast.error('Please choose a CSV or Excel file first');
      return;
    }

    setLoadingPreview(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataset', dataset);

      const response = await fetch('/api/imports', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate import preview');
      }

      setPreview(data as PreviewResponse);
      setMapping((data as PreviewResponse).suggestedMapping || {});
      toast.success('Preview generated. Review mapping before import.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse import file');
      setPreview(null);
      setMapping({});
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleConfirmImport() {
    if (!preview) {
      toast.error('Generate a preview before confirming import');
      return;
    }

    const missingRequired = datasetFields.filter((field) => field.required && !mapping[field.key]);
    if (missingRequired.length > 0) {
      toast.error(`Missing required mapping: ${missingRequired.map((field) => field.label).join(', ')}`);
      return;
    }

    setConfirming(true);

    try {
      const response = await fetch('/api/imports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: preview.jobId,
          dataset,
          mapping,
          skipInvalid: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm import');
      }

      setResult({
        inserted: Number(data.inserted || 0),
        updated: Number(data.updated || 0),
        invalidRows: Number(data.validation?.invalidRows || 0),
      });

      toast.success('Import confirmed and records saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete import');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Guided Data Import</h1>
          <p className="text-sm text-muted-foreground">
            Upload file, preview rows, map columns, validate, and confirm import.
          </p>
        </div>
        <Link href="/farm">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Upload File</CardTitle>
          <CardDescription>
            Supports CSV and Excel files. Import is never applied until you confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Dataset</p>
              <Select value={dataset} onValueChange={(value) => setDataset(value as Dataset)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  {DATASET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">Source file</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <Button onClick={handlePreviewUpload} disabled={loadingPreview || !file} className="gap-2">
            <Upload className="h-4 w-4" />
            {loadingPreview ? 'Generating Preview...' : 'Generate Preview'}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Map Columns</CardTitle>
              <CardDescription>
                Confirm how your file columns map to farm record fields before import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Rows: {preview.totalRows}</Badge>
                <Badge variant="outline">Valid: {preview.validation.validRows}</Badge>
                <Badge variant={preview.validation.invalidRows > 0 ? 'destructive' : 'secondary'}>
                  Invalid: {preview.validation.invalidRows}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {datasetFields.map((field) => (
                  <div key={field.key}>
                    <p className="mb-1 text-xs text-muted-foreground">
                      {field.label} {field.required ? '(required)' : '(optional)'}
                    </p>
                    <Select
                      value={mapping[field.key] || '__none__'}
                      onValueChange={(value) => updateMapping(field.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Do not map</SelectItem>
                        {preview.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 3: Review Preview</CardTitle>
              <CardDescription>Sample rows from your file before confirmation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.previewRows.map((row, index) => (
                      <TableRow key={`row-${index}`}>
                        {preview.headers.map((header) => (
                          <TableCell key={`${index}-${header}`}>{String(row[header] ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {preview.validation.errors.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="mb-2 text-sm font-medium text-destructive">Validation errors (first 10)</p>
                  <ul className="space-y-1 text-xs text-destructive">
                    {preview.validation.errors.slice(0, 10).map((error, index) => (
                      <li key={`error-${index}`}>
                        Row {error.row} - {error.field}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={handleConfirmImport} disabled={confirming} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {confirming ? 'Importing...' : 'Confirm Import'}
              </Button>

              {result && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Import completed
                  </div>
                  <p className="mt-1 text-xs">
                    Inserted: {result.inserted} | Updated: {result.updated} | Skipped invalid: {result.invalidRows}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
