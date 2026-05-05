'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FarmPermission } from '@/modules/farms/permissions';

interface FarmPermissionSnapshot {
  farm: {
    id: string;
    name: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
  };
  member: {
    id: string;
    role: {
      id: string;
      name: string;
      rank: number;
      permissions: string[];
    };
  };
  role: {
    id: string;
    name: string;
    rank: number;
    permissions: string[];
  };
  permissions: string[];
}

export function usePermissions(farmId?: string | null) {
  const [snapshot, setSnapshot] = useState<FarmPermissionSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(farmId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadPermissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/farms/${farmId}`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load farm permissions');
        }

        if (isMounted) {
          setSnapshot({
            farm: payload.farm,
            member: payload.member,
            role: payload.role,
            permissions: payload.permissions || [],
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load permissions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPermissions();

    return () => {
      isMounted = false;
    };
  }, [farmId]);

  const permissionSet = useMemo(() => new Set(snapshot?.permissions || []), [snapshot]);

  const can = useCallback(
    (permission: FarmPermission) => {
      return permissionSet.has(permission);
    },
    [permissionSet]
  );

  return {
    loading,
    error,
    farm: snapshot?.farm || null,
    member: snapshot?.member || null,
    role: snapshot?.role || null,
    permissions: snapshot?.permissions || [],
    can,
    reload: () => {
      if (!farmId) return Promise.resolve();
      return fetch(`/api/farms/${farmId}`, { cache: 'no-store' }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to reload permissions');
        }
        setSnapshot({
          farm: payload.farm,
          member: payload.member,
          role: payload.role,
          permissions: payload.permissions || [],
        });
      });
    },
  };
}
