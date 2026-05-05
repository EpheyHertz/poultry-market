'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

// TypeScript Types for Farm Management
export type FlockStatus = 'ACTIVE' | 'SOLD' | 'CULLED' | 'PROCESSING';
export type HealthAlertType = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Flock {
  id: string;
  name: string;
  breed: string;
  quantity: number;
  status: FlockStatus;
  dateAdded: Date;
  averageWeight: number;
  averageAge: number;
  mortality: number;
  FCR: number; // Feed Conversion Ratio
  farmId: string;
}

export interface HealthRecord {
  id: string;
  flockId: string;
  farmId?: string;
  type: 'VACCINATION' | 'TREATMENT' | 'MORTALITY' | 'DISEASE_ALERT';
  description: string;
  date: Date;
  severity: HealthAlertType;
  quantity?: number; // for mortality logs
  notes?: string;
}

export interface FeedInventory {
  id: string;
  feedType: string;
  quantity: number; // in kg
  unit: string;
  reorderLevel: number;
  supplier: string;
  lastRestockDate: Date;
  costPerUnit: number;
  farmId: string;
}

export interface SalesRecord {
  id: string;
  productType: 'EGGS' | 'MEAT' | 'LIVE_BIRDS' | 'CUSTOM';
  customProductType?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalRevenue: number;
  date: Date;
  buyerName: string;
  notes?: string;
  farmId: string;
}

export interface FarmStats {
  totalFlocks: number;
  totalBirds: number;
  healthAlerts: number;
  feedStockDays: number;
  monthlyRevenue: number;
  averageFCR: number;
  mortalityRate: number;
}

interface FarmContextType {
  activeFarmId: string | null;
  setActiveFarmId: (farmId: string | null) => void;
  flocks: Flock[];
  healthRecords: HealthRecord[];
  feedInventory: FeedInventory[];
  salesRecords: SalesRecord[];
  stats: FarmStats;
  
  // Flock operations
  addFlock: (flock: Flock) => void;
  updateFlock: (id: string, flock: Partial<Flock>) => void;
  deleteFlock: (id: string) => void;
  
  // Health operations
  addHealthRecord: (record: HealthRecord) => void;
  updateHealthRecord: (id: string, record: Partial<HealthRecord>) => void;
  deleteHealthRecord: (id: string) => void;
  getHealthAlerts: () => HealthRecord[];
  
  // Feed operations
  addFeedInventory: (feed: FeedInventory) => void;
  updateFeedInventory: (id: string, feed: Partial<FeedInventory>) => void;
  getLowStockFeeds: () => FeedInventory[];
  
  // Sales operations
  addSalesRecord: (sale: SalesRecord) => void;
  updateSalesRecord: (id: string, sale: Partial<SalesRecord>) => void;
  deleteSalesRecord: (id: string) => void;
  getMonthlySales: (months: number) => number;
  
  // Stats
  recalculateStats: () => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

type ApiFlock = {
  id: string;
  name: string;
  breed: string | null;
  birdCount: number;
  status: FlockStatus;
  acquiredAt?: string | Date | null;
  createdAt?: string | Date;
  farmId?: string | null;
  userId?: string;
}

type ApiFeedRecord = {
  id: string;
  feedType: string;
  quantityKg: number;
  cost: number | null;
  recordedOn: string | Date;
  notes?: string | null;
}

type ApiMortalityRecord = {
  id: string;
  flockId: string | null;
  count: number;
  cause: string | null;
  notes: string | null;
  recordedOn: string | Date;
  flock?: { id: string; name: string } | null;
}

type ApiVaccinationRecord = {
  id: string;
  flockId: string | null;
  vaccineName: string;
  scheduledDate: string | Date;
  administeredDate: string | Date | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED';
  notes: string | null;
  flock?: { id: string; name: string } | null;
}

type ApiPosSale = {
  id: string;
  total: number;
  createdAt: string | Date;
  customerName?: string | null;
  notes?: string | null;
  items?: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

const toDate = (value?: string | Date | null) => {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
};

const mapFlock = (flock: ApiFlock): Flock => ({
  id: flock.id,
  name: flock.name,
  breed: flock.breed || '',
  quantity: flock.birdCount,
  status: flock.status,
  dateAdded: toDate(flock.acquiredAt || flock.createdAt),
  averageWeight: 0,
  averageAge: 0,
  mortality: 0,
  FCR: 0,
  farmId: flock.farmId || flock.userId || 'farm',
});

const mapFeedRecordsToInventory = (records: ApiFeedRecord[], farmId?: string | null): FeedInventory[] => {
  const grouped = new Map<string, {
    quantity: number;
    lastRestockDate: Date;
    totalCost: number;
    recordCount: number;
    notes: string[];
  }>();

  for (const record of records) {
    const existing = grouped.get(record.feedType) || {
      quantity: 0,
      lastRestockDate: toDate(record.recordedOn),
      totalCost: 0,
      recordCount: 0,
      notes: [],
    };

    existing.quantity += record.quantityKg || 0;
    existing.lastRestockDate = new Date(Math.max(existing.lastRestockDate.getTime(), toDate(record.recordedOn).getTime()));
    existing.totalCost += record.cost || 0;
    existing.recordCount += 1;
    if (record.notes) existing.notes.push(record.notes);

    grouped.set(record.feedType, existing);
  }

  return Array.from(grouped.entries()).map(([feedType, data], index) => ({
    id: `feed-${index + 1}`,
    feedType,
    quantity: data.quantity,
    unit: 'kg',
    reorderLevel: Math.max(Math.round(data.quantity * 0.25), 1),
    supplier: data.notes[0] || 'Recorded feed stock',
    lastRestockDate: data.lastRestockDate,
    costPerUnit: data.quantity > 0 ? data.totalCost / data.quantity : 0,
    farmId: farmId || 'farm',
  }));
};

const mapHealthRecords = (
  mortalityRecords: ApiMortalityRecord[],
  vaccinations: ApiVaccinationRecord[],
  farmId?: string | null
): HealthRecord[] => {
  const mortalityEntries = mortalityRecords.map((record) => ({
    id: record.id,
    flockId: record.flockId || record.flock?.id || '',
    farmId: farmId || undefined,
    type: 'MORTALITY' as const,
    description: record.cause ? `Mortality - ${record.cause}` : 'Mortality record',
    date: toDate(record.recordedOn),
    severity: record.count >= 10 ? 'CRITICAL' as const : 'WARNING' as const,
    quantity: record.count,
    notes: record.notes || record.cause || undefined,
  }));

  const vaccinationEntries = vaccinations.map((record) => ({
    id: record.id,
    flockId: record.flockId || record.flock?.id || '',
    farmId: farmId || undefined,
    type: 'VACCINATION' as const,
    description: record.vaccineName,
    date: toDate(record.scheduledDate),
    severity: record.status === 'MISSED' ? 'WARNING' as const : 'INFO' as const,
    notes: record.notes || undefined,
  }));

  return [...vaccinationEntries, ...mortalityEntries];
};

const mapSales = (sales: ApiPosSale[], farmId?: string | null): SalesRecord[] =>
  sales.map((sale, index) => {
    const quantity = sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const firstItemName = sale.items?.[0]?.productName || 'Sale';
    const label = sale.items && sale.items.length > 1
      ? sale.items.map((item) => item.productName).join(', ')
      : firstItemName;

    return {
      id: sale.id || `sale-${index + 1}`,
      productType: 'CUSTOM',
      customProductType: label,
      quantity: quantity || 1,
      unit: 'units',
      pricePerUnit: quantity > 0 ? sale.total / quantity : sale.total,
      totalRevenue: sale.total,
      date: toDate(sale.createdAt),
      buyerName: sale.customerName || 'Walk-in customer',
      notes: sale.notes || undefined,
      farmId: farmId || 'farm',
    };
  });

export function FarmProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [feedInventory, setFeedInventory] = useState<FeedInventory[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [stats, setStats] = useState<FarmStats>({
    totalFlocks: 0,
    totalBirds: 0,
    healthAlerts: 0,
    feedStockDays: 0,
    monthlyRevenue: 0,
    averageFCR: 0,
    mortalityRate: 0,
  });

  useEffect(() => {
    const farmIdFromQuery = searchParams.get('farmId');

    if (farmIdFromQuery) {
      setActiveFarmId(farmIdFromQuery);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('activeFarmId', farmIdFromQuery);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('activeFarmId');
      if (stored) {
        setActiveFarmId(stored);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const withFarmId = (path: string) => {
      if (!activeFarmId) return path;
      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}farmId=${encodeURIComponent(activeFarmId)}`;
    };

    const loadFarmData = async () => {
      try {
        if (!activeFarmId) {
          setFlocks([]);
          setFeedInventory([]);
          setHealthRecords([]);
          setSalesRecords([]);
          return;
        }

        const [flocksRes, feedRes, mortalityRes, vaccinationsRes, salesRes] = await Promise.all([
          fetch(withFarmId('/api/farm/flocks'), { cache: 'no-store' }),
          fetch(withFarmId('/api/farm/feed-records'), { cache: 'no-store' }),
          fetch(withFarmId('/api/farm/mortality-records'), { cache: 'no-store' }),
          fetch(withFarmId('/api/farm/vaccinations'), { cache: 'no-store' }),
          fetch('/api/pos/sales?period=all&limit=1000', { cache: 'no-store' }),
        ]);

        const [flocksBody, feedBody, mortalityBody, vaccinationsBody, salesBody] = await Promise.all([
          flocksRes.json(),
          feedRes.json(),
          mortalityRes.json(),
          vaccinationsRes.json(),
          salesRes.json(),
        ]);

        if (!flocksRes.ok) throw new Error(flocksBody.error || 'Failed to load flocks');
        if (!feedRes.ok) throw new Error(feedBody.error || 'Failed to load feed records');
        if (!mortalityRes.ok) throw new Error(mortalityBody.error || 'Failed to load mortality records');
        if (!vaccinationsRes.ok) throw new Error(vaccinationsBody.error || 'Failed to load vaccinations');
        if (!salesRes.ok) throw new Error(salesBody.error || 'Failed to load sales records');

        if (!isMounted) return;

        const nextFlocks = (flocksBody.flocks || []).map(mapFlock);
        const nextFeedInventory = mapFeedRecordsToInventory(feedBody.records || [], activeFarmId);
        const nextHealthRecords = mapHealthRecords(mortalityBody.records || [], vaccinationsBody.records || [], activeFarmId);
        const nextSalesRecords = mapSales(salesBody.sales || [], activeFarmId);

        setFlocks(nextFlocks);
        setFeedInventory(nextFeedInventory);
        setHealthRecords(nextHealthRecords);
        setSalesRecords(nextSalesRecords);
      } catch (error) {
        console.error('Failed to load farm data', error);
      }
    };

    void loadFarmData();

    return () => {
      isMounted = false;
    };
  }, [activeFarmId]);

  const getMonthlySalesFrom = (records: SalesRecord[], months = 1) => {
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());

    return records
      .filter((record) => record.date >= cutoffDate)
      .reduce((total, record) => total + record.totalRevenue, 0);
  };

  const buildStats = (
    currentFlocks: Flock[],
    currentHealthRecords: HealthRecord[],
    currentFeedInventory: FeedInventory[],
    currentSalesRecords: SalesRecord[]
  ): FarmStats => {
    const totalBirds = currentFlocks.reduce((sum, flock) => sum + flock.quantity, 0);
    const totalFeed = currentFeedInventory.reduce((sum, feed) => sum + feed.quantity, 0);
    const mortalityCount = currentHealthRecords
      .filter((record) => record.type === 'MORTALITY')
      .reduce((sum, record) => sum + (record.quantity || 0), 0);

    return {
      totalFlocks: currentFlocks.length,
      totalBirds,
      healthAlerts: currentHealthRecords.filter((record) => record.severity !== 'INFO').length,
      feedStockDays: totalBirds > 0 ? Math.max(Math.round(totalFeed / Math.max(totalBirds * 0.12, 1)), 0) : 0,
      monthlyRevenue: getMonthlySalesFrom(currentSalesRecords, 1),
      averageFCR: totalBirds > 0 ? Number((totalFeed / totalBirds).toFixed(2)) : 0,
      mortalityRate: totalBirds > 0 ? Number(((mortalityCount / totalBirds) * 100).toFixed(2)) : 0,
    };
  };

  const addFlock = (flock: Flock) => {
    if (!activeFarmId) {
      console.warn('Select a farm before adding a flock');
      return;
    }
    const optimisticId = flock.id;
    setFlocks((prev) => [...prev, { ...flock, farmId: activeFarmId }]);

    void (async () => {
      try {
        const response = await fetch('/api/farm/flocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmId: activeFarmId,
            name: flock.name,
            breed: flock.breed || null,
            birdCount: flock.quantity,
            acquiredAt: flock.dateAdded.toISOString(),
            status: flock.status,
            notes: null,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create flock');

        setFlocks((prev) => prev.map((item) => (item.id === optimisticId ? mapFlock(data.flock) : item)));
      } catch (error) {
        console.error('Failed to persist flock', error);
      }
    })();
  };

  const updateFlock = (id: string, updates: Partial<Flock>) => {
    setFlocks((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));

    void (async () => {
      try {
        const response = await fetch(`/api/farm/flocks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updates.name,
            breed: updates.breed,
            birdCount: updates.quantity,
            status: updates.status,
            acquiredAt: updates.dateAdded ? updates.dateAdded.toISOString() : undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update flock');

        setFlocks((prev) => prev.map((item) => (item.id === id ? mapFlock(data.flock) : item)));
      } catch (error) {
        console.error('Failed to update flock', error);
      }
    })();
  };

  const deleteFlock = (id: string) => {
    setFlocks((prev) => prev.filter((f) => f.id !== id));

    void (async () => {
      try {
        const response = await fetch(`/api/farm/flocks/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete flock');
      } catch (error) {
        console.error('Failed to delete flock', error);
      }
    })();
  };

  const addHealthRecord = (record: HealthRecord) => {
    if (!activeFarmId) {
      console.warn('Select a farm before adding a health record');
      return;
    }
    const optimisticId = record.id;
    setHealthRecords((prev) => [...prev, { ...record, farmId: activeFarmId }]);

    void (async () => {
      try {
        const endpoint = record.type === 'MORTALITY' ? '/api/farm/mortality-records' : '/api/farm/vaccinations';
        const payload = record.type === 'MORTALITY'
          ? {
              farmId: activeFarmId,
              flockId: record.flockId,
              count: record.quantity || 0,
              cause: record.notes || record.description,
              notes: record.notes || null,
              recordedOn: record.date.toISOString(),
            }
          : {
              farmId: activeFarmId,
              flockId: record.flockId,
              vaccineName: record.description,
              status: record.severity === 'CRITICAL' ? 'MISSED' : 'SCHEDULED',
              notes: record.notes || null,
              scheduledDate: record.date.toISOString(),
            };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create record');

        const persisted = record.type === 'MORTALITY'
          ? {
              id: data.record.id,
              flockId: data.record.flock?.id || record.flockId,
              type: 'MORTALITY' as const,
              description: data.record.cause ? `Mortality - ${data.record.cause}` : 'Mortality record',
              date: toDate(data.record.recordedOn),
              severity: data.record.count >= 10 ? ('CRITICAL' as const) : ('WARNING' as const),
              quantity: data.record.count,
              notes: data.record.notes || data.record.cause || undefined,
            }
          : {
              id: data.vaccination.id,
              flockId: data.vaccination.flock?.id || record.flockId,
              type: 'VACCINATION' as const,
              description: data.vaccination.vaccineName,
              date: toDate(data.vaccination.scheduledDate),
              severity: data.vaccination.status === 'MISSED' ? ('WARNING' as const) : ('INFO' as const),
              notes: data.vaccination.notes || undefined,
            };

        setHealthRecords((prev) => prev.map((item) => (item.id === optimisticId ? persisted : item)));
      } catch (error) {
        console.error('Failed to persist health record', error);
      }
    })();
  };

  const updateHealthRecord = (id: string, updates: Partial<HealthRecord>) => {
    setHealthRecords((prev) => prev.map((record) => (record.id === id ? { ...record, ...updates } : record)));

    void (async () => {
      try {
        const current = healthRecords.find((record) => record.id === id);
        const targetType = updates.type || current?.type;
        if (!targetType) return;

        const endpoint = targetType === 'MORTALITY' ? `/api/farm/mortality-records/${id}` : `/api/farm/vaccinations/${id}`;
        const payload = targetType === 'MORTALITY'
          ? {
              flockId: updates.flockId,
              count: updates.quantity,
              cause: updates.notes || updates.description,
              notes: updates.notes,
              recordedOn: updates.date ? updates.date.toISOString() : undefined,
            }
          : {
              flockId: updates.flockId,
              vaccineName: updates.description,
              notes: updates.notes,
              scheduledDate: updates.date ? updates.date.toISOString() : undefined,
              status: updates.severity === 'CRITICAL' ? 'MISSED' : undefined,
            };

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update record');
      } catch (error) {
        console.error('Failed to update health record', error);
      }
    })();
  };

  const deleteHealthRecord = (id: string) => {
    const existing = healthRecords.find((record) => record.id === id);
    setHealthRecords((prev) => prev.filter((record) => record.id !== id));

    void (async () => {
      try {
        if (!existing) return;
        const endpoint = existing.type === 'MORTALITY' ? `/api/farm/mortality-records/${id}` : `/api/farm/vaccinations/${id}`;
        const response = await fetch(endpoint, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete record');
      } catch (error) {
        console.error('Failed to delete health record', error);
      }
    })();
  };

  const getHealthAlerts = () => {
    return healthRecords.filter((r) => r.severity !== 'INFO');
  };

  const addFeedInventory = (feed: FeedInventory) => {
    if (!activeFarmId) {
      console.warn('Select a farm before adding feed');
      return;
    }
    setFeedInventory((prev) => [...prev, feed]);

    void (async () => {
      try {
        const response = await fetch('/api/farm/feed-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmId: activeFarmId,
            flockId: null,
            feedType: feed.feedType,
            quantityKg: feed.quantity,
            cost: feed.quantity * feed.costPerUnit,
            notes: feed.supplier,
            recordedOn: feed.lastRestockDate.toISOString(),
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create feed record');
      } catch (error) {
        console.error('Failed to persist feed inventory', error);
      }
    })();
  };

  const updateFeedInventory = (id: string, updates: Partial<FeedInventory>) => {
    setFeedInventory((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const getLowStockFeeds = () => {
    return feedInventory.filter((f) => f.quantity <= f.reorderLevel);
  };

  const addSalesRecord = (sale: SalesRecord) => {
    setSalesRecords((prev) => [...prev, sale]);
  };

  const updateSalesRecord = (id: string, updates: Partial<SalesRecord>) => {
    setSalesRecords((prev) => prev.map((sale) => (sale.id === id ? { ...sale, ...updates } : sale)));
  };

  const deleteSalesRecord = (id: string) => {
    setSalesRecords((prev) => prev.filter((sale) => sale.id !== id));
  };

  const getMonthlySales = (months: number = 1) => {
    return getMonthlySalesFrom(salesRecords, months);
  };

  const recalculateStats = () => {
    setStats(buildStats(flocks, healthRecords, feedInventory, salesRecords));
  };

  useEffect(() => {
    setStats(buildStats(flocks, healthRecords, feedInventory, salesRecords));
  }, [flocks, healthRecords, feedInventory, salesRecords]);

  const value: FarmContextType = {
    activeFarmId,
    setActiveFarmId: (nextFarmId) => {
      setActiveFarmId(nextFarmId);
      if (typeof window !== 'undefined') {
        if (nextFarmId) {
          window.localStorage.setItem('activeFarmId', nextFarmId);
        } else {
          window.localStorage.removeItem('activeFarmId');
        }
      }
    },
    flocks,
    healthRecords,
    feedInventory,
    salesRecords,
    stats,
    addFlock,
    updateFlock,
    deleteFlock,
    addHealthRecord,
    updateHealthRecord,
    deleteHealthRecord,
    getHealthAlerts,
    addFeedInventory,
    updateFeedInventory,
    getLowStockFeeds,
    addSalesRecord,
    updateSalesRecord,
    deleteSalesRecord,
    getMonthlySales,
    recalculateStats,
  };

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarm must be used within FarmProvider');
  }
  return context;
}
