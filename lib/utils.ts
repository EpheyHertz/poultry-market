import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatProductTypeLabel(type?: string | null, customType?: string | null) {
  if (!type) {
    return '';
  }

  if (type === 'CUSTOM' && customType) {
    return customType;
  }

  return type.replace(/_/g, ' ');
}
