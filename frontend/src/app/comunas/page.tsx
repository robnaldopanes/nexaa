import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { COMUNAS } from '@/lib/constants';
import Link from 'next/link';

export default function ComunasPage() {
  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <section className="px-margin-mobile mt-stack-md">
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-primary mb-2">
            Comunas
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Noticias de cada comuna de la Región de Ñuble
          </p>
        </section>

        <section className="mt-stack-md">
          <div className="px-margin-mobile mb-4">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant">
                search
              </span>
              <label className="sr-only" htmlFor="comuna-search">Buscar comuna</label>
              <input
                id="comuna-search"
                type="text"
                placeholder="Buscar comuna..."
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md"
              />
            </div>
          </div>

          <div className="px-margin-mobile space-y-2">
            {COMUNAS.map((comuna) => (
              <Link
                key={comuna.slug}
                href={`/comunas/${comuna.slug}`}
                className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 shadow-sm card-press hover:border-secondary transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant">
                  location_on
                </span>
                <span className="text-body-md text-primary">{comuna.name}</span>
                <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[20px]">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </section>

        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
