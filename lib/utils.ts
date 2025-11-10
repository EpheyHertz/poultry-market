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

  return type
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function sanitizeNextRedirect(path?: string | null) {
  if (!path) {
    return null;
  }

  const trimmed = path.trim();

  if (!trimmed.startsWith('/')) {
    return null;
  }

  if (trimmed.startsWith('//')) {
    return null;
  }

  if (trimmed.includes('://')) {
    return null;
  }

  return trimmed;
}
