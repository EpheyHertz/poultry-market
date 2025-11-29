'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export type ApiKeyStatus = 'ACTIVE' | 'INACTIVE' | 'REVOKED';

export interface ApiKeyListItem {
  id: string;
  name: string;
  status: ApiKeyStatus;
  maskedKey: string;
  lastFour: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
}

interface ApiKeyManagerProps {
  className?: string;
  title?: string;
  description?: string;
}

type ApiKeyResponse = {
  apiKey: {
    id: string;
    name: string;
    status: ApiKeyStatus;
    createdAt: string;
    maskedKey: string;
  };
  token: string;
};

const statusMeta: Record<ApiKeyStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ACTIVE: { label: 'Active', variant: 'default' },
  INACTIVE: { label: 'Inactive', variant: 'secondary' },
  REVOKED: { label: 'Revoked', variant: 'outline' },
};

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value ?? 'Never';
  }
}

async function readJson<T>(response: Response) {
  const fallbackError = 'Something went wrong';
  let parsed: unknown = null;

  try {
    parsed = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new Error(fallbackError);
    }
    return parsed as T;
  }

  if (!response.ok) {
    const message =
      typeof (parsed as any)?.error === 'string' ? (parsed as any).error : fallbackError;
    throw new Error(message);
  }

  return parsed as T;
}

export function ApiKeyManager({
  className,
  title = 'API Keys',
  description = 'Create and manage API keys for your integrations.',
}: ApiKeyManagerProps) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createName, setCreateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ token: string; name: string } | null>(null);
  const [pendingActionIds, setPendingActionIds] = useState<Record<string, boolean>>({});
  const [deleteConfirmInputs, setDeleteConfirmInputs] = useState<Record<string, string>>({});
  const [copiedIndicator, setCopiedIndicator] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasKeys = keys.length > 0;

  const showActionToast = (action: 'copied' | 'revoked' | 'activated' | 'deactivated') => {
    const copy = {
      copied: {
        title: 'API key copied',
        description: 'Secret copied to clipboard successfully.',
      },
      revoked: {
        title: 'API key revoked',
        description: 'The key can no longer be used and should be rotated in your apps.',
      },
      activated: {
        title: 'API key reactivated',
        description: 'You can use this key again immediately.',
      },
      deactivated: {
        title: 'API key paused',
        description: 'Calls using this key will now fail until you reactivate it.',
      },
    } as const;

    toast(copy[action]);
  };

  const fetchKeys = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/api-keys', { cache: 'no-store' });
      const data = await readJson<ApiKeyListItem[]>(res);
      setKeys(data);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failed to load keys',
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const setPendingFor = (id: string, pending: boolean) => {
    setPendingActionIds((prev) => {
      const next = { ...prev };
      if (pending) {
        next[id] = true;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchKeys();
  };

  const handleCreateKey = async () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      toast({
        title: 'Name is required',
        description: 'Give your API key a descriptive label.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await readJson<ApiKeyResponse>(res);
      setCreateName('');
      setNewKey({ token: data.token, name: data.apiKey.name });
      toast({
        title: 'API key created',
        description: 'Copy the key now—it will not be shown again.',
      });
      await fetchKeys();
    } catch (error) {
      toast({
        title: 'Failed to create key',
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (key: ApiKeyListItem) => {
    if (key.status === 'REVOKED') return;

    const nextStatus: ApiKeyStatus = key.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setPendingFor(key.id, true);

    try {
      const res = await fetch(`/api/api-keys/${key.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      await readJson(res);
      await fetchKeys();
      showActionToast(nextStatus === 'ACTIVE' ? 'activated' : 'deactivated');
    } catch (error) {
      toast({
        title: 'Failed to update key',
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setPendingFor(key.id, false);
    }
  };

  const handleRevokeKey = async (key: ApiKeyListItem) => {
    if (key.status === 'REVOKED') return;

    setPendingFor(key.id, true);
    try {
      const res = await fetch(`/api/api-keys/${key.id}`, {
        method: 'DELETE',
      });
      await readJson(res);
      showActionToast('revoked');
      await fetchKeys();
      setDeleteConfirmInputs((prev) => {
        const next = { ...prev };
        delete next[key.id];
        return next;
      });
    } catch (error) {
      toast({
        title: 'Failed to revoke key',
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setPendingFor(key.id, false);
    }
  };

  const handleCopyNewToken = async () => {
    if (!newKey?.token) return;
    try {
      await navigator.clipboard.writeText(newKey.token);
      showActionToast('copied');
      setCopiedIndicator(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopiedIndicator(false), 2500);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Copy the token manually if clipboard access is blocked.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const renderKeys = () => {
    if (isFetching) {
      return (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading API keys...
        </div>
      );
    }

    if (!hasKeys) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
          <KeyRound className="h-10 w-10 text-gray-400" />
          <div>
            <p className="text-base font-medium text-gray-900">No API keys yet</p>
            <p className="text-sm text-gray-500">Create your first key to start integrating with our APIs.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {keys.map((key) => {
          const status = statusMeta[key.status];
          const isPending = !!pendingActionIds[key.id];

          return (
            <div key={key.id} className="rounded-lg border border-gray-200 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-gray-900">{key.name}</p>
                  <p className="text-sm text-gray-500">Key: {key.maskedKey}</p>
                  <p className="text-xs text-gray-400">
                    Created {formatDate(key.createdAt)} • Last used {formatDate(key.lastUsedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={key.status === 'REVOKED' || isPending}
                    onClick={() => handleToggleStatus(key)}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : key.status === 'ACTIVE' ? (
                      <ShieldOff className="mr-2 h-4 w-4" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    {key.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        disabled={key.status === 'REVOKED' || isPending}
                        onClick={() =>
                          setDeleteConfirmInputs((prev) => ({
                            ...prev,
                            [key.id]: prev[key.id] ?? '',
                          }))
                        }
                      >
                        {isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API key</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. Once deleted, the key cannot be recovered and any integrations
                          using it will fail until you configure a new key.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          Type <span className="font-semibold">{key.name}</span> below to confirm deletion.
                        </p>
                        <Input
                          value={deleteConfirmInputs[key.id] ?? ''}
                          onChange={(event) =>
                            setDeleteConfirmInputs((prev) => ({ ...prev, [key.id]: event.target.value }))
                          }
                          placeholder="Enter API key name"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          onClick={() =>
                            setDeleteConfirmInputs((prev) => {
                              const next = { ...prev };
                              delete next[key.id];
                              return next;
                            })
                          }
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeKey(key)}
                          className="bg-rose-600 hover:bg-rose-700"
                          disabled={
                            isPending ||
                            (deleteConfirmInputs[key.id] ?? '').trim() !== key.name.trim()
                          }
                        >
                          Delete permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {key.status === 'REVOKED' && (
                <p className="mt-3 text-sm text-rose-600">
                  Revoked keys cannot be reactivated. Create a new key if you need access again.
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          {isRefreshing || isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {newKey && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Copy your new API key</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                This is the only time we will show the secret for <strong>{newKey.name}</strong>.
              </p>
              <div className="flex flex-col gap-3 rounded-md border border-dashed border-amber-300 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <code className="break-all text-sm text-gray-900">{newKey.token}</code>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopyNewToken}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  {copiedIndicator && (
                    <span className="flex items-center text-sm font-medium text-emerald-700">
                      <Check className="mr-1 h-4 w-4" /> Copied
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewKey(null);
                      setCopiedIndicator(false);
                      if (copyTimeoutRef.current) {
                        clearTimeout(copyTimeoutRef.current);
                        copyTimeoutRef.current = null;
                      }
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-gray-200 p-4 sm:p-5">
          <p className="text-sm font-medium text-gray-900">Create new key</p>
          <p className="text-xs text-gray-500">Use a descriptive name so you know which integration this key belongs to.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="e.g. Blog publisher"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              maxLength={50}
            />
            <Button onClick={handleCreateKey} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Create key
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-gray-900">Existing keys</p>
          <p className="text-xs text-gray-500">
            Activate, deactivate, or revoke keys at any time. Last-used timestamps update automatically.
          </p>
        </div>

        {renderKeys()}
      </CardContent>
    </Card>
  );
}

export default ApiKeyManager;
