import { Search as SearchIcon } from 'lucide-react';
import { Input } from './input';

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...'
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <div className="relative">
    <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-foreground/60" />
    <Input className="pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </div>
);
