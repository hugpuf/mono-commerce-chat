import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BUSINESS_CATEGORIES = [
  'Shopping & Retail',
  'Clothing Store',
  'Restaurant',
  'Food & Beverage',
  'Beauty & Personal Care',
  'Health & Wellness',
  'Professional Services',
  'Education',
  'Entertainment',
  'Technology & Electronics',
  'Home & Garden',
  'Automotive',
  'Travel & Tourism',
  'Real Estate',
  'Financial Services',
  'Other'
] as const;

interface CategorySelectProps {
  value?: string;
  onChange: (value: string) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="category">Business Category</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="category">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {BUSINESS_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
