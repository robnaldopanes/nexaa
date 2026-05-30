import { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/supabase-server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://celebrated-commitment-production-737c.up.railway.app';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/fotos`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/categorias`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/comunas`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/buscar`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
  ];

  try {
    const { data: news } = await supabaseServer
      .from('news')
      .select('slug, published_at, updated_at')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('published_at', { ascending: false })
      .limit(500);

    if (news && news.length > 0) {
      const newsRoutes: MetadataRoute.Sitemap = news.map((item) => ({
        url: `${baseUrl}/noticia/${item.slug}`,
        lastModified: new Date(item.updated_at || item.published_at),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
      return [...staticRoutes, ...newsRoutes];
    }
  } catch (err) {
    console.error('Error generating sitemap:', err);
  }

  return staticRoutes;
}
