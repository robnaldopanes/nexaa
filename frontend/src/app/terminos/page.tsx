import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';

export default function TerminosPage() {
  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <div className="px-margin-mobile mt-stack-md max-w-2xl">
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-primary mb-4">Términos y Condiciones</h1>
          <p className="text-label-sm text-on-surface-variant mb-6">Última actualización: {new Date().toLocaleDateString('es-CL')}</p>

          <div className="space-y-6 text-body-md text-on-surface leading-relaxed">
            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">1. Aceptación de los términos</h2>
              <p>Al acceder y utilizar NEXAA, aceptás estos términos. Si no estás de acuerdo, no utilices el sitio.</p>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">2. Naturaleza del contenido</h2>
              <p>NEXAA es un agregador de noticias regionales. Utilizamos fuentes públicas, RSS feeds e inteligencia artificial para generar resúmenes informativos automáticos. No nos hacemos responsables por la exactitud de la información publicada. Para información oficial, consultá siempre la fuente original enlazada en cada noticia.</p>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">3. Propiedad intelectual</h2>
              <p>Los titulares y resúmenes generados por NEXAA son originales. Las imágenes pueden provenir de fuentes públicas o ser aportadas por usuarios. Si sos titular de algún contenido y deseás que sea removido, contactanos.</p>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">4. Responsabilidad</h2>
              <p>La información puede estar sujeta a cambios. NEXAA no garantiza la veracidad, integridad o actualidad de los contenidos. No nos hacemos responsables por decisiones tomadas basadas en la información publicada.</p>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">5. Contacto</h2>
              <p>Para consultas, reclamos o solicitudes de remoción de contenido, escribinos a <a href="mailto:contacto@nexaa.cl" className="text-secondary underline">contacto@nexaa.cl</a>.</p>
            </section>
          </div>
        </div>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
