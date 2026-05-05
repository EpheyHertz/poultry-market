'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFarm } from '@/contexts/farm-context';
import {
  ArrowDownToLine,
  BellRing,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  PackageOpen,
  Pill,
  ReceiptText,
  Settings2,
  Shell,
  Store,
  TrendingUp,
  Truck,
  UserRoundPen,
} from 'lucide-react';

type FarmNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FARM_NAV_ITEMS: FarmNavItem[] = [
  { href: '/farm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/farm/flocks', label: 'Flocks', icon: Shell },
  { href: '/farm/feed', label: 'Feed', icon: PackageOpen },
  { href: '/farm/health', label: 'Health', icon: Pill },
  { href: '/farm/sales', label: 'Sales', icon: CreditCard },
  { href: '/farm/records', label: 'Records', icon: ReceiptText },
  { href: '/farm/reminders', label: 'Reminders', icon: BellRing },
  { href: '/farm/import', label: 'Import', icon: ArrowDownToLine },
  { href: '/farm/attachments', label: 'Attachments', icon: BookOpen },
  { href: '/farm/reports', label: 'Reports', icon: TrendingUp },
  { href: '/farm/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/farm/settings', label: 'Settings', icon: Settings2 },
];

export function FarmNavigationBar() {
  const pathname = usePathname();
  const { activeFarmId } = useFarm();

  if (!pathname?.startsWith('/farm')) {
    return null;
  }

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12 py-3">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 lg:flex">
            <Truck className="h-4 w-4" />
            Farm Management
          </div>

          {FARM_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const href = activeFarmId
              ? `${item.href}?farmId=${encodeURIComponent(activeFarmId)}`
              : item.href;

            return (
              <Link
                key={item.href}
                href={href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}