import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { CATEGORIES } from '@/lib/constants';
import Link from 'next/link';

export default function CategoriesPage() {
  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <section className="px-margin-mobile mt-stack-md">
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-primary mb-2">
            Categorías
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Explora las noticias por tema de interés
          </p>
        </section>

        <section className="mt-stack-md px-margin-mobile grid grid-cols-2 gap-gutter">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categorias/${cat.slug}`}
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm card-press flex flex-col items-center gap-2 hover:border-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-secondary text-[32px]">
                {cat.icon}
              </span>
              <span className="text-label-md font-label-md text-primary">{cat.name}</span>
            </Link>
          ))}
        </section>

        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
