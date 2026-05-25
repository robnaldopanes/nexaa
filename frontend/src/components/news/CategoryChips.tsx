'use client';

import { CATEGORIES } from '@/lib/constants';

interface CategoryChipsProps {
  active?: string;
  onSelect?: (slug: string) => void;
}

export default function CategoryChips({ active, onSelect }: CategoryChipsProps) {
  return (
    <div className="w-full max-w-full overflow-x-auto no-scrollbar flex items-center gap-2 px-margin-mobile py-2">
      <button
        onClick={() => onSelect?.('')}
        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-label-md font-label-md shadow-sm transition-colors ${
          !active
            ? 'bg-primary text-on-primary'
            : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        Todo
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onSelect?.(cat.slug)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-label-md font-label-md transition-colors ${
            active === cat.slug
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
