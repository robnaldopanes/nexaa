import { Metadata } from 'next';
import Link from 'next/link';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import NewsActions from './NewsActions';
import { supabaseServer } from '@/lib/supabase-server';
import { getNewsImage, getCategoryIcon, cleanEllipsis } from '@/lib/utils';
import { generateNewsMetadata, generateNewsSchema } from '@/lib/metadata';
import { NewsItem } from '@/lib/types';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const { data } = await supabaseServer
      .from('news')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (!data) return { title: 'Noticia no encontrada' };
    return generateNewsMetadata(data);
  } catch {
    return { title: 'NEXAA Ñuble' };
  }
}

async function fetchNews(slug: string): Promise<NewsItem | null> {
  try {
    const { data } = await supabaseServer
      .from('news')
      .select('*')
      .eq('slug', slug)
      .single();
    return data || null;
  } catch {
    return null;
  }
}

function timeAgo(dateStr: string) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  } catch {
    return 'Reciente';
  }
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const news = await fetchNews(params.slug);

  if (!news) {
    return (
      <>
        <TopAppBar />
        <main className="pt-14 pb-20 overflow-x-hidden">
          <div className="px-margin-mobile mt-stack-lg text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[64px]">drafts</span>
            <h1 className="text-headline-lg font-headline-lg text-primary mt-4">Noticia no encontrada</h1>
            <p className="text-body-md text-on-surface-variant mt-2 mb-6">Esta noticia no está disponible.</p>
            <Link href="/" className="inline-block px-gutter py-3 bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 active:scale-95 transition-all">
              Volver al inicio
            </Link>
          </div>
          <Footer />
        </main>
        <BottomNav />
      </>
    );
  }

  const imageUrl = getNewsImage(news.image_url, news.category);
  const schema = generateNewsSchema(news);
  const isReportaje = news.category === 'Reportajes';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <article className="px-margin-mobile mt-stack-md">
          {/* Categoría y Comuna */}
          <div className="flex items-center gap-2">
            {isReportaje ? (
              <span className="inline-flex items-center gap-1.5 bg-secondary text-on-secondary text-label-sm font-label-sm px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                Reportaje
              </span>
            ) : (
              <span className="text-secondary text-label-sm font-label-sm uppercase tracking-wider">
                {news.category}
              </span>
            )}
            {news.comuna && (
              <>
                <span className="text-on-surface-variant/40 text-[12px]">&bull;</span>
                <span className="text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {news.comuna}
                </span>
              </>
            )}
          </div>

          {/* Titular */}
          <h1 className={`text-headline-lg-mobile font-headline-lg-mobile text-primary mt-2 leading-tight ${isReportaje ? 'text-[28px] md:text-[36px]' : ''}`}>
            {news.title}
          </h1>

          {/* Metadatos */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-stack-sm text-label-sm text-on-surface-variant border-b border-outline-variant/20 pb-3">
            <span className="font-bold text-primary">{news.source_name || 'NEXAA'}</span>
            <span>&middot;</span>
            <span>{timeAgo(news.published_at)}</span>
          </div>

          {/* Imagen Principal */}
          {imageUrl ? (
            <div className={`mt-stack-md bg-surface-container-high rounded-xl overflow-hidden shadow-sm ${isReportaje ? 'aspect-[21/9]' : 'aspect-video'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={news.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="mt-stack-md aspect-video bg-gradient-to-br from-[#121216] to-[#1e1e26] rounded-xl flex flex-col justify-between p-6 border border-outline-variant/20 relative overflow-hidden shadow-sm select-none">
              <div className="absolute -right-10 -bottom-16 opacity-[0.03] text-[200px] font-bold select-none pointer-events-none">
                NEXAA
              </div>
              <div className="flex justify-between items-center w-full z-10">
                <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  NEXAA Regional
                </span>
                <span className="text-on-surface-variant text-[12px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">{getCategoryIcon(news.category)}</span>
                  {news.category}
                </span>
              </div>
              <div className="z-10 mt-auto">
                <span className="material-symbols-outlined text-secondary/40 text-[56px] mb-3">
                  {getCategoryIcon(news.category)}
                </span>
                <p className="text-on-surface-variant/80 text-body-lg italic pr-8 max-w-lg leading-relaxed">
                  &ldquo;Esta noticia se encuentra en desarrollo en los portales regionales de la Provincia de Ñuble.&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Resumen */}
          {news.summary && (
            <div className={`mt-stack-md p-4 bg-surface-container-low border-l-4 border-secondary rounded-r-xl italic text-body-lg text-on-surface-variant ${isReportaje ? 'text-xl leading-relaxed' : ''}`}>
              &ldquo;{cleanEllipsis(news.summary)}&rdquo;
            </div>
          )}

          {/* Contenido Completo */}
          <div className={`mt-stack-md space-y-4 text-body-lg text-on-surface leading-relaxed ${isReportaje ? 'text-xl space-y-6 leading-[1.8]' : ''}`}>
            {(cleanEllipsis(news.content) || '').split('\n').filter((p: string) => p.trim() !== '').map((para: string, i: number) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Etiquetas SEO */}
          {news.tags && news.tags.length > 0 && (
            <div className="mt-stack-md flex flex-wrap gap-2">
              {news.tags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-label-sm rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Enlace original */}
          {news.source_url && (
            <div className="mt-stack-lg p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">link</span>
                <span className="text-label-sm font-label-sm text-on-surface-variant">Fuente original de la noticia</span>
              </div>
              <a href={news.source_url} target="_blank" rel="noopener noreferrer" className="text-secondary text-label-md font-label-md hover:underline break-all inline-flex items-center gap-1 active:scale-95 transition-all">
                Leer noticia completa en {news.source_name || 'fuente original'}
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          )}

          {/* Botón compartir + contador de vistas */}
          <NewsActions newsId={news.id} slug={news.slug} title={news.title} initialViews={news.views || 0} />
        </article>

        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
