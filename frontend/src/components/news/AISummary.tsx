interface AISummaryItem {
  number: string;
  text: string;
}

interface AISummaryProps {
  items: AISummaryItem[];
  date?: string;
}

export default function AISummary({ items, date }: AISummaryProps) {
  return (
    <div className="ai-glow rounded-xl p-4 bg-surface-container-lowest shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="material-symbols-outlined material-symbols-filled text-secondary text-[20px]"
        >
          auto_awesome
        </span>
        <h2 className="text-label-md font-label-md uppercase tracking-wider text-on-surface-variant">
          Resumen del Día IA
        </h2>
        {date && (
          <span className="text-label-sm text-on-surface-variant ml-auto">{date}</span>
        )}
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.number} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-[10px] font-bold">
              {item.number}
            </span>
            <p className="text-body-md text-on-surface leading-tight line-clamp-2">
              {item.text.length > 120 ? item.text.slice(0, 120).trim() + '...' : item.text}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-end">
        <button className="text-secondary text-label-sm font-label-sm flex items-center gap-1 hover:opacity-80 transition-opacity">
          ESCUCHAR RESUMEN{' '}
          <span className="material-symbols-outlined text-[16px]">play_circle</span>
        </button>
      </div>
    </div>
  );
}
