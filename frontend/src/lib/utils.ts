export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} minutos`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function cleanEllipsis(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\[\s*&#8230;\s*\]/g, '')
    .replace(/\[\s*&hellip;\s*\]/g, '')
    .replace(/&#8230;/g, '')
    .replace(/&hellip;/g, '')
    .replace(/\[\s*\.\.\.\s*\]/g, '')
    .replace(/\[\s*…\s*\]/g, '')
    .replace(/\s*[…\.]+\s*$/, '')
    .trim();
}


export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    politica: 'bg-blue-100 text-blue-800',
    emergencias: 'bg-red-100 text-red-800',
    deportes: 'bg-green-100 text-green-800',
    subsidios: 'bg-yellow-100 text-yellow-800',
    transito: 'bg-orange-100 text-orange-800',
    clima: 'bg-cyan-100 text-cyan-800',
    turismo: 'bg-teal-100 text-teal-800',
    economia: 'bg-purple-100 text-purple-800',
    cultura: 'bg-pink-100 text-pink-800',
    social: 'bg-indigo-100 text-indigo-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

const CATEGORY_IMAGES: Record<string, string> = {
  'Política': 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&q=80',
  'Emergencias': 'https://images.unsplash.com/photo-1599733589046-9b8308b5b50d?w=800&q=80',
  'Deportes': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
  'Subsidios': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
  'Tránsito': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80',
  'Clima': 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&q=80',
  'Turismo': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
  'Economía': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  'Cultura': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80',
  'Social': 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&q=80',
  'Regional': 'https://images.unsplash.com/photo-1473163928189-364b2c4e1135?w=800&q=80',
};

export function isDataUrl(url: string): boolean {
  return url.startsWith('data:image');
}

export function getNewsImage(imageUrl: string | null | undefined, category: string): string {
  if (imageUrl && imageUrl.trim()) {
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }
    if (imageUrl.startsWith('http')) {
      const isGoogleImage = imageUrl.includes('googleusercontent.com') || 
                            imageUrl.includes('google.com') || 
                            imageUrl.includes('gstatic.com');
      if (!isGoogleImage) {
        return imageUrl;
      }
    }
  }
  return '/images/placeholder-news.svg';
}

export const PLACEHOLDER_IMAGE = '/images/placeholder-news.svg';

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Política': 'account_balance',
    'Emergencias': 'warning',
    'Deportes': 'sports_soccer',
    'Subsidios': 'savings',
    'Tránsito': 'directions_car',
    'Clima': 'cloud',
    'Turismo': 'hiking',
    'Economía': 'trending_up',
    'Cultura': 'theater_comedy',
    'Social': 'groups',
  };
  return icons[category] || 'newspaper';
}

export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_NEXAA_API_URL) {
    return process.env.NEXT_PUBLIC_NEXAA_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

