'use client';

import { useState } from 'react';

export default function SearchBar({
  placeholder = 'Buscar noticias en Ñuble...',
  onSearch,
}: {
  placeholder?: string;
  onSearch?: (query: string) => void;
}) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full px-margin-mobile">
      <div className="relative flex items-center group">
        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant">
          search
        </span>
        <label className="sr-only" htmlFor="search-input">{placeholder}</label>
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md"
        />
      </div>
    </form>
  );
}
