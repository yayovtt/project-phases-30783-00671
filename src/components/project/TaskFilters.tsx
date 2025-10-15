import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  display_name: string;
}

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  requiredOnly: boolean;
  onRequiredOnlyChange: (value: boolean) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categories: Category[];
  totalResults: number;
  onReset: () => void;
}

export function TaskFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  requiredOnly,
  onRequiredOnlyChange,
  statusFilter,
  onStatusFilterChange,
  categories,
  totalResults,
  onReset,
}: TaskFiltersProps) {
  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || requiredOnly || statusFilter !== 'all';

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4 mb-6" dir="rtl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">סינון משימות</h3>
          <Badge variant="secondary">{totalResults} נמצאו</Badge>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4 ml-2" />
            איפוס סינונים
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש משימה..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="כל הקטגוריות" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="כל הסטטוסים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="pending">בתהליך</SelectItem>
            <SelectItem value="completed">הושלמו</SelectItem>
          </SelectContent>
        </Select>

        {/* Required Only Toggle */}
        <div className="flex items-center gap-2 h-10">
          <Switch
            id="required-only"
            checked={requiredOnly}
            onCheckedChange={onRequiredOnlyChange}
          />
          <Label htmlFor="required-only" className="cursor-pointer">
            משימות חובה בלבד
          </Label>
        </div>
      </div>
    </div>
  );
}
