'use client';

import { useState } from 'react';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { getApiUrl } from '@/lib/utils';

export default function ReportarPage() {
  const apiUrl = getApiUrl();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch(`${apiUrl}/api/photos/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error_report',
          content: message.trim(),
          user_email: email.trim(),
          status: 'pending',
        }),
      });
      setSent(true);
    } catch { setSent(true); }
    setSending(false);
  };

  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <div className="px-margin-mobile mt-stack-md max-w-xl mx-auto">
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-primary mb-2">Reportar un error</h1>
          <p className="text-body-md text-on-surface-variant mb-6">
            ¿Encontraste una noticia incorrecta, un enlace roto o algo que no funciona? Contanos.
          </p>

          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-green-600 text-[48px]">check_circle</span>
              <p className="text-body-lg text-green-800 mt-2 font-bold">¡Gracias por tu reporte!</p>
              <p className="text-body-md text-green-700 mt-1">Lo revisaremos a la brevedad.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Describí el error *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Ej: El enlace de la noticia no funciona, la imagen no carga, hay información incorrecta..."
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-y"
                  required
                />
              </div>
              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Tu correo (opcional, para responderte)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                />
              </div>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full py-3 bg-primary text-on-primary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Enviando...</> : 'Enviar reporte'}
              </button>
            </form>
          )}
        </div>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
