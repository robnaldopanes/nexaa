const STORAGE_KEY_NEWS = 'nexaa_published_news';
const STORAGE_KEY_PHOTOS = 'nexaa_published_photos';

export function getPublishedNews(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_NEWS) || '[]');
  } catch { return []; }
}

export function addPublishedNews(item: any) {
  if (typeof window === 'undefined') return;
  const list = getPublishedNews();
  list.unshift({ ...item, id: 'local_' + Date.now(), views: 0 });
  localStorage.setItem(STORAGE_KEY_NEWS, JSON.stringify(list.slice(0, 50)));
}

export function getPublishedPhotos(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PHOTOS) || '[]');
  } catch { return []; }
}

export function addPublishedPhoto(item: any) {
  if (typeof window === 'undefined') return;
  const list = getPublishedPhotos();
  list.unshift({ ...item, id: 'local_' + Date.now(), likes: 0 });
  localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(list.slice(0, 50)));
}
