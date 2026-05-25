import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';

export default function PrivacidadPage() {
  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <div className="px-margin-mobile mt-stack-md max-w-2xl">
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-primary mb-4">Política de Privacidad</h1>
          <p className="text-label-sm text-on-surface-variant mb-6">Última actualización: {new Date().toLocaleDateString('es-CL')}</p>

          <div className="space-y-6 text-body-md text-on-surface leading-relaxed">
            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">1. Datos que recopilamos</h2>
              <p>NEXAA no requiere registro para leer noticias. Solo recopilamos datos cuando:</p>
              <ul className="list-disc pl-6 mt-1 space-y-1">
                <li>Envías una fotografía (guardamos tu nombre, email y la imagen)</li>
                <li>Reportás un error (guardamos tu mensaje y email si lo proporcionás)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">2. Uso de los datos</h2>
              <p>Tus datos personales solo se usan para:</p>
              <ul className="list-disc pl-6 mt-1 space-y-1">
                <li>Acreditar la autoría de tus fotografías</li>
                <li>Contactarte si hay novedades sobre tu envío</li>
                <li>Mejorar la calidad del servicio</li>
              </ul>
              <p className="mt-2">No compartimos, vendemos ni cedemos tus datos a terceros.</p>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">3. Cookies y almacenamiento local</h2>
              <p>Usamos localStorage para guardar preferencias de tema (modo claro/oscuro). No usamos cookies de seguimiento ni publicitarias.</p>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">4. Inteligencia Artificial</h2>
              <p>Utilizamos Google Gemini para generar resúmenes automáticos. El contenido enviado a la IA es únicamente texto de noticias públicas. No se envían datos personales a servicios de IA.</p>
            </section>

            <section>
              <h2 className="text-headline-md font-headline-md text-primary mb-2">5. Tus derechos</h2>
              <p>Podés solicitar la eliminación de tus datos personales en cualquier momento escribiendo a <a href="mailto:contacto@nexaa.cl" className="text-secondary underline">contacto@nexaa.cl</a>.</p>
            </section>
          </div>
        </div>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
