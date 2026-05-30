'use client';

import { useState, useEffect } from 'react';
import { getApiUrl, getNewsUrl } from '@/lib/utils';

interface NewsActionsProps {
  newsId: string;
  slug: string;
  title: string;
  initialViews: number;
}

export default function NewsActions({ newsId, slug, title, initialViews }: NewsActionsProps) {
  const [views, setViews] = useState(initialViews);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const apiUrl = getApiUrl();
  const newsUrl = getNewsUrl(slug);

  useEffect(() => {
    fetch(`${apiUrl}/api/news/${newsId}/view`, { method: 'POST' })
      .then(res => res.json())
      .then(result => {
        if (result.views) setViews(result.views);
      })
      .catch(() => {});
  }, [newsId, apiUrl]);

  const shareText = encodeURIComponent(title);
  const shareUrl = encodeURIComponent(newsUrl);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    whatsapp: `https://wa.me/?text=${shareText}%20${shareUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
    telegram: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: newsUrl });
      } catch {}
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(newsUrl);
      alert('Enlace copiado');
    } catch {}
  };

  return (
    <div className="flex items-center justify-between mt-stack-lg pt-4 border-t border-outline-variant/20">
      <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]">visibility</span>
        {views} {views === 1 ? 'lectura' : 'lecturas'}
      </span>

      <div className="relative">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          Compartir
        </button>

        {showShareMenu && (
          <div className="absolute bottom-full right-0 mb-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg p-2 min-w-[200px] z-50">
            <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface">
              <span className="text-[18px]">📘</span> Facebook
            </a>
            <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface">
              <span className="text-[18px]">💬</span> WhatsApp
            </a>
            <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface">
              <span className="text-[18px]">🐦</span> Twitter / X
            </a>
            <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface">
              <span className="text-[18px]">✈️</span> Telegram
            </a>
            <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface">
              <span className="text-[18px]">💼</span> LinkedIn
            </a>
            <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface">
              <span className="text-[18px]">🔗</span> Copiar enlace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
