'use client';

import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

import { brandButtonClass, formatPrice, type FilterOption, type TypeFilterOption } from './product-helpers';

type ProductFiltersProps = {
    variant: 'sidebar' | 'sheet';
    availableCategories: FilterOption[];
    availableTypes: TypeFilterOption[];
    availableTags: FilterOption[];
    availableLocations: string[];
    selectedCategory: string;
    typeSelectValue: string;
    selectedType: string;
    selectedCustomType: string | null;
    selectedLocation: string;
    selectedTags: string[];
    priceRange: [number, number];
    sliderMin: number;
    sliderMax: number;
    priceRangeLabel: string;
    hasActiveFilters: boolean;
    activeFiltersCount: number;
    onCategoryChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onLocationChange: (value: string) => void;
    onToggleTag: (value: string) => void;
    onPriceRangeChange: (value: [number, number]) => void;
    onClearFilters: () => void;
    onClose?: () => void;
};

export default function ProductFilters({
    variant,
    availableCategories,
    availableTypes,
    availableTags,
    availableLocations,
    selectedCategory,
    typeSelectValue,
    selectedType,
    selectedCustomType,
    selectedLocation,
    selectedTags,
    priceRange,
    sliderMin,
    sliderMax,
    priceRangeLabel,
    hasActiveFilters,
    activeFiltersCount,
    onCategoryChange,
    onTypeChange,
    onLocationChange,
    onToggleTag,
    onPriceRangeChange,
    onClearFilters,
    onClose,
}: ProductFiltersProps) {
    const isSheet = variant === 'sheet';
    const quickTypeOptions = availableTypes.slice(0, isSheet ? 6 : 8);
    const tagDisplayLimit = isSheet ? 12 : 18;

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        Filters
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {hasActiveFilters
                            ? `${activeFiltersCount} active filter${activeFiltersCount === 1 ? '' : 's'}`
                            : 'Narrow results by category, type, location, and budget.'}
                    </p>
                </div>
                {hasActiveFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="h-8 shrink-0 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                        Reset all
                    </Button>
                )}
            </div>

            <Separator />

            <div className={cn('grid gap-4', isSheet ? 'grid-cols-1' : 'grid-cols-1')}>
                <div className="space-y-1.5">
                    <Label htmlFor={`${variant}-category`} className="text-xs font-medium text-muted-foreground">
                        Category
                    </Label>
                    <Select value={selectedCategory} onValueChange={onCategoryChange}>
                        <SelectTrigger id={`${variant}-category`} className="h-10">
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {availableCategories.map(category => (
                                <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                    {category.count ? ` (${category.count})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor={`${variant}-type`} className="text-xs font-medium text-muted-foreground">
                        Product type
                    </Label>
                    <Select value={typeSelectValue} onValueChange={onTypeChange}>
                        <SelectTrigger id={`${variant}-type`} className="h-10">
                            <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            {availableTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>
                                    {type.label}
                                    {type.count ? ` (${type.count})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor={`${variant}-location`} className="text-xs font-medium text-muted-foreground">
                        Location
                    </Label>
                    <Select value={selectedLocation} onValueChange={onLocationChange}>
                        <SelectTrigger id={`${variant}-location`} className="h-10">
                            <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All locations</SelectItem>
                            {availableLocations.map(location => (
                                <SelectItem key={location} value={location}>
                                    {location}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {quickTypeOptions.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-2.5">
                        <p className="text-xs font-medium text-muted-foreground">Popular types</p>
                        <div className="flex flex-wrap gap-2">
                            {quickTypeOptions.map(option => {
                                const isActive = selectedCustomType
                                    ? option.customType === selectedCustomType
                                    : selectedType === option.type && !option.customType;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={isActive}
                                        onClick={() => onTypeChange(isActive ? 'all' : option.id)}
                                        className={cn(
                                            'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                            isActive
                                                ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950'
                                                : 'border-border bg-card text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10'
                                        )}
                                    >
                                        <span className="max-w-[12rem] truncate">{option.label}</span>
                                        {option.count ? <span className="opacity-70">{option.count}</span> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {availableTags.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-2.5">
                        <p className="text-xs font-medium text-muted-foreground">Attributes</p>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.slice(0, tagDisplayLimit).map(tag => {
                                const isActive = selectedTags.includes(tag.value);
                                return (
                                    <button
                                        key={tag.value}
                                        type="button"
                                        aria-pressed={isActive}
                                        onClick={() => onToggleTag(tag.value)}
                                        className={cn(
                                            'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                            isActive
                                                ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950'
                                                : 'border-border bg-card text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10'
                                        )}
                                    >
                                        <span className="max-w-[12rem] truncate">{tag.label}</span>
                                        {tag.count ? <span className="opacity-70">{tag.count}</span> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <Separator />

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Price range</p>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                        {priceRangeLabel}
                    </span>
                </div>
                <Slider
                    value={priceRange}
                    onValueChange={(value: number[]) => onPriceRangeChange(value as [number, number])}
                    min={sliderMin}
                    max={sliderMax}
                    step={100}
                    aria-label="Price range"
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatPrice(sliderMin)}</span>
                    <span>{formatPrice(sliderMax)}</span>
                </div>
            </div>

            {isSheet && (
                <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
                    <Button type="button" onClick={onClose} className={cn('h-10 flex-1', brandButtonClass)}>
                        Show results
                    </Button>
                    {hasActiveFilters && (
                        <Button type="button" variant="outline" className="h-10" onClick={onClearFilters}>
                            Clear
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
