'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Link2Off, Trash2, UploadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  eggRecordId?: string | null;
  flockId?: string | null;
  feedRecordId?: string | null;
  mortalityRecordId?: string | null;
  vaccinationId?: string | null;
}

interface OptionItem {
  id: string;
  label: string;
}

type LinkField = 'eggRecordId' | 'flockId' | 'feedRecordId' | 'mortalityRecordId' | 'vaccinationId';
type FilterField = LinkField | 'all';

const LINK_OPTIONS: Array<{ value: LinkField; label: string }> = [
  { value: 'eggRecordId', label: 'Egg Record' },
  { value: 'flockId', label: 'Flock' },
  { value: 'feedRecordId', label: 'Feed Record' },
  { value: 'mortalityRecordId', label: 'Mortality Record' },
  { value: 'vaccinationId', label: 'Vaccination' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function hasAttachmentLink(item: Attachment, field: LinkField): boolean {
  return Boolean(item[field]);
}

const LINK_LABEL_MAP: Record<LinkField, string> = {
  eggRecordId: 'Egg Record',
  flockId: 'Flock',
  feedRecordId: 'Feed Record',
  mortalityRecordId: 'Mortality Record',
  vaccinationId: 'Vaccination',
};

function getAttachmentLinkLabels(item: Attachment): string[] {
  return (Object.keys(LINK_LABEL_MAP) as LinkField[])
    .filter((key) => Boolean(item[key]))
    .map((key) => LINK_LABEL_MAP[key]);
}

export default function FarmAttachmentsPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionAttachmentId, setActionAttachmentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [linkField, setLinkField] = useState<LinkField>('eggRecordId');
  const [linkId, setLinkId] = useState('none');
  const [filterField, setFilterField] = useState<FilterField>('all');
  const [filterId, setFilterId] = useState('none');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [eggOptions, setEggOptions] = useState<OptionItem[]>([]);
  const [flockOptions, setFlockOptions] = useState<OptionItem[]>([]);
  const [feedOptions, setFeedOptions] = useState<OptionItem[]>([]);
  const [mortalityOptions, setMortalityOptions] = useState<OptionItem[]>([]);
  const [vaccinationOptions, setVaccinationOptions] = useState<OptionItem[]>([]);

  const selectedOptions = useMemo(() => {
    if (linkField === 'eggRecordId') return eggOptions;
    if (linkField === 'flockId') return flockOptions;
    if (linkField === 'feedRecordId') return feedOptions;
    if (linkField === 'mortalityRecordId') return mortalityOptions;
    return vaccinationOptions;
  }, [eggOptions, feedOptions, flockOptions, linkField, mortalityOptions, vaccinationOptions]);

  const filterOptions = useMemo(() => {
    if (filterField === 'all') return [];
    if (filterField === 'eggRecordId') return eggOptions;
    if (filterField === 'flockId') return flockOptions;
    if (filterField === 'feedRecordId') return feedOptions;
    if (filterField === 'mortalityRecordId') return mortalityOptions;
    return vaccinationOptions;
  }, [eggOptions, feedOptions, filterField, flockOptions, mortalityOptions, vaccinationOptions]);

  const filteredAttachments = useMemo(() => {
    if (filterField === 'all') {
      return attachments;
    }

    if (filterId !== 'none') {
      return attachments.filter((item) => item[filterField] === filterId);
    }

    return attachments.filter((item) => hasAttachmentLink(item, filterField));
  }, [attachments, filterField, filterId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        attachmentsRes,
        eggsRes,
        flocksRes,
        feedRes,
        mortalityRes,
        vaccinationsRes,
      ] = await Promise.all([
        fetch('/api/attachments', { cache: 'no-store' }),
        fetch('/api/egg-records?pageSize=20', { cache: 'no-store' }),
        fetch('/api/farm/flocks', { cache: 'no-store' }),
        fetch('/api/farm/feed-records', { cache: 'no-store' }),
        fetch('/api/farm/mortality-records', { cache: 'no-store' }),
        fetch('/api/farm/vaccinations', { cache: 'no-store' }),
      ]);

      const [
        attachmentsBody,
        eggsBody,
        flocksBody,
        feedBody,
        mortalityBody,
        vaccinationsBody,
      ] = await Promise.all([
        attachmentsRes.json(),
        eggsRes.json(),
        flocksRes.json(),
        feedRes.json(),
        mortalityRes.json(),
        vaccinationsRes.json(),
      ]);

      if (!attachmentsRes.ok) throw new Error(attachmentsBody.error || 'Failed to load attachments');
      if (!eggsRes.ok) throw new Error(eggsBody.error || 'Failed to load egg records');
      if (!flocksRes.ok) throw new Error(flocksBody.error || 'Failed to load flocks');
      if (!feedRes.ok) throw new Error(feedBody.error || 'Failed to load feed records');
      if (!mortalityRes.ok) throw new Error(mortalityBody.error || 'Failed to load mortality records');
      if (!vaccinationsRes.ok) throw new Error(vaccinationsBody.error || 'Failed to load vaccinations');

      setAttachments(attachmentsBody.attachments || []);
      setEggOptions(
        (eggsBody.records || []).map((record: any) => ({
          id: record.id,
          label: `${new Date(record.recordedOn).toLocaleDateString()} - ${record.quantity} eggs`,
        }))
      );
      setFlockOptions(
        (flocksBody.flocks || []).map((flock: any) => ({
          id: flock.id,
          label: flock.name,
        }))
      );
      setFeedOptions(
        (feedBody.records || []).map((record: any) => ({
          id: record.id,
          label: `${new Date(record.recordedOn).toLocaleDateString()} - ${record.feedType}`,
        }))
      );
      setMortalityOptions(
        (mortalityBody.records || []).map((record: any) => ({
          id: record.id,
          label: `${new Date(record.recordedOn).toLocaleDateString()} - ${record.count} birds`,
        }))
      );
      setVaccinationOptions(
        (vaccinationsBody.records || []).map((record: any) => ({
          id: record.id,
          label: `${record.vaccineName} - ${new Date(record.scheduledDate).toLocaleDateString()}`,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load attachment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setLinkId('none');
  }, [linkField]);

  useEffect(() => {
    setFilterId('none');
  }, [filterField]);

  async function handleUpload() {
    if (!file) {
      toast.error('Please choose a file first');
      return;
    }

    if (linkId === 'none') {
      toast.error('Select a record to link this attachment to');
      return;
    }

    setUploading(true);
    try {
      const signedPayloadRes = await fetch('/api/attachments/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }),
      });

      const signedPayload = await signedPayloadRes.json();
      if (!signedPayloadRes.ok) {
        throw new Error(signedPayload.error || 'Failed to create signed upload payload');
      }

      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('api_key', signedPayload.apiKey);
      cloudinaryFormData.append('timestamp', String(signedPayload.timestamp));
      cloudinaryFormData.append('signature', signedPayload.signature);
      cloudinaryFormData.append('folder', signedPayload.folder);
      cloudinaryFormData.append('public_id', signedPayload.publicId);

      const cloudinaryRes = await fetch(signedPayload.uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      const cloudinaryBody = await cloudinaryRes.json();
      if (!cloudinaryRes.ok) {
        throw new Error(cloudinaryBody.error?.message || 'Cloudinary upload failed');
      }

      const registerBody: Record<string, unknown> = {
        fileName: file.name,
        fileUrl: cloudinaryBody.secure_url,
        mimeType: file.type || cloudinaryBody.resource_type || 'application/octet-stream',
        sizeBytes: file.size,
      };
      registerBody[linkField] = linkId;

      const registerRes = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerBody),
      });

      const registerResponse = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerResponse.error || 'Failed to register attachment');
      }

      toast.success('Attachment uploaded and linked successfully');
      setFile(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    setActionAttachmentId(attachmentId);
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Failed to delete attachment');
      }

      toast.success('Attachment deleted');
      if (selectedAttachment?.id === attachmentId) {
        setSelectedAttachment(null);
      }
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete attachment');
    } finally {
      setActionAttachmentId(null);
    }
  }

  async function handleUnlinkAttachment(attachmentId: string, unlinkField: LinkField) {
    setActionAttachmentId(attachmentId);
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlinkField }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Failed to unlink attachment');
      }

      if (body.deleted) {
        toast.success('Attachment unlinked and removed (no remaining links)');
      } else {
        toast.success('Attachment unlinked');
      }

      if (selectedAttachment?.id === attachmentId) {
        setSelectedAttachment(null);
      }
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unlink attachment');
    } finally {
      setActionAttachmentId(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Loading attachment manager...</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Attachments</h1>
          <p className="text-sm text-muted-foreground">
            Upload files via signed URLs and link them to farm records.
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
          <CardTitle className="text-lg">Upload Attachment</CardTitle>
          <CardDescription>
            Choose a file, choose target record type, select record, and upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={linkField} onValueChange={(value) => setLinkField(value as LinkField)}>
              <SelectTrigger>
                <SelectValue placeholder="Record type" />
              </SelectTrigger>
              <SelectContent>
                {LINK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={linkId} onValueChange={setLinkId}>
              <SelectTrigger>
                <SelectValue placeholder="Select record" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a record</SelectItem>
                {selectedOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleUpload} disabled={uploading || !file} className="gap-2">
            <UploadCloud className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Attachment'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uploaded Attachments</CardTitle>
          <CardDescription>Filter, preview, unlink, or delete linked files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={filterField} onValueChange={(value) => setFilterField(value as FilterField)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by link type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All attachments</SelectItem>
                {LINK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterId}
              onValueChange={setFilterId}
              disabled={filterField === 'all' || filterOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any linked record" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any linked record</SelectItem>
                {filterOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilterField('all');
                setFilterId('none');
              }}
            >
              Clear Filter
            </Button>
          </div>

          {filteredAttachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments uploaded yet.</p>
          ) : (
            filteredAttachments.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {item.fileName}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.mimeType} | {formatBytes(item.sizeBytes)} | {new Date(item.createdAt).toLocaleString()}
                </p>

                <div className="mt-2 flex flex-wrap gap-1">
                  {getAttachmentLinkLabels(item).map((label) => (
                    <Badge key={`${item.id}-${label}`} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setSelectedAttachment(item)}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>

                  {filterField !== 'all' && hasAttachmentLink(item, filterField) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleUnlinkAttachment(item.id, filterField)}
                      disabled={actionAttachmentId === item.id}
                    >
                      <Link2Off className="h-4 w-4" />
                      {actionAttachmentId === item.id ? 'Unlinking...' : `Unlink ${LINK_LABEL_MAP[filterField]}`}
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleDeleteAttachment(item.id)}
                    disabled={actionAttachmentId === item.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    {actionAttachmentId === item.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedAttachment)} onOpenChange={(open) => !open && setSelectedAttachment(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attachment Preview</DialogTitle>
            <DialogDescription>{selectedAttachment?.fileName}</DialogDescription>
          </DialogHeader>

          {selectedAttachment && (
            <div className="space-y-3">
              {selectedAttachment.mimeType.startsWith('image/') ? (
                <div className="overflow-hidden rounded-md border">
                  <Image
                    src={selectedAttachment.fileUrl}
                    alt={selectedAttachment.fileName}
                    width={1200}
                    height={700}
                    className="h-auto w-full object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Inline preview is only available for images. Use the link below to open this file.
                </p>
              )}

              <div className="rounded-md border p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Type:</span> {selectedAttachment.mimeType}
                </p>
                <p>
                  <span className="text-muted-foreground">Size:</span> {formatBytes(selectedAttachment.sizeBytes)}
                </p>
                <p>
                  <span className="text-muted-foreground">Uploaded:</span>{' '}
                  {new Date(selectedAttachment.createdAt).toLocaleString()}
                </p>
              </div>

              <a
                href={selectedAttachment.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                Open original file
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
