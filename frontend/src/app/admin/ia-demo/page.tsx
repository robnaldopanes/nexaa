'use client';

import { useState } from 'react';
import { getApiUrl } from '@/lib/utils';

export default function IADemoPage() {
  const apiUrl = getApiUrl();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('url');

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body = activeTab === 'url'
        ? { url }
        : { title: 'Noticia de prueba', content: text };

      const endpoint = activeTab === 'url'
        ? `${apiUrl}/api/news/analyze-url`
        : `${apiUrl}/api/ai/summarize`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-stack-lg">
        <p className="text-on-surface-variant font-label-md text-label-sm uppercase tracking-widest mb-1">Laboratorio IA</p>
        <h1 className="text-headline-lg font-headline-lg text-primary">Demo de Inteligencia Artificial</h1>
        <p className="text-body-md text-on-surface-variant mt-2">
          Prueba el flujo completo de IA sin necesidad de clave API de OpenAI.
          {!result?._demo && ' El sistema detecta automáticamente si hay clave configurada.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Input panel */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-outline-variant/30">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-3 text-label-md font-label-md transition-colors ${activeTab === 'url' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant'}`}
            >
              Pegar enlace
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-3 text-label-md font-label-md transition-colors ${activeTab === 'text' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant'}`}
            >
              Escribir texto
            </button>
          </div>
          <div className="p-gutter">
            {activeTab === 'url' ? (
              <div className="space-y-3">
                <label className="text-label-sm text-on-surface-variant block">URL de la noticia</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.ladiscusion.cl/noticia-ejemplo/"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                />
                <p className="text-label-sm text-on-surface-variant/60">
                  El sistema hará extracción de la URL y luego la IA analizará el contenido.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-label-sm text-on-surface-variant block">Título</label>
                <input
                  type="text"
                  placeholder="Título de la noticia..."
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                />
                <label className="text-label-sm text-on-surface-variant block">Contenido</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="Pega o escribe el contenido de la noticia aquí..."
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-none"
                />
              </div>
            )}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-4 py-3 bg-primary text-on-primary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Analizando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined material-symbols-filled text-[20px]">auto_awesome</span>
                  Analizar con IA
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result panel */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
          <div className="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/50 flex items-center gap-2">
            <span className="material-symbols-outlined material-symbols-filled text-secondary">auto_awesome</span>
            <h2 className="text-headline-md font-headline-md text-primary">Resultado IA</h2>
            {result?._engine === 'demo' && (
              <span className="text-label-sm bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full ml-auto">Demo</span>
            )}
            {result?._engine === 'gemini' && (
              <span className="text-label-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-auto">Gemini IA</span>
            )}
            {result?._engine === 'openai' && (
              <span className="text-label-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-auto">OpenAI</span>
            )}
            {result && !result._engine && !result.error && (
              <span className="text-label-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-auto">IA</span>
            )}
          </div>
          <div className="p-gutter">
            {!result && !loading && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-on-surface-variant text-[64px]">psychology</span>
                <p className="text-body-lg text-on-surface-variant mt-3">Resultado aparecerá aquí</p>
                <p className="text-label-md text-on-surface-variant/60 mt-1">Ingresa texto o un enlace y presiona Analizar</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
                <p className="text-body-lg text-on-surface-variant mt-3">Procesando...</p>
              </div>
            )}

            {result?.error && (
              <div className="bg-error-container text-on-error-container p-4 rounded-xl">
                <p className="text-label-md font-bold">Error</p>
                <p className="text-body-md">{result.error}</p>
              </div>
            )}

            {result && !result.error && (
              <div className="space-y-4">
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                  <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Título generado</span>
                  <p className="text-body-md font-bold text-primary mt-1">{result.title || result.generated?.title}</p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                  <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Resumen</span>
                  <p className="text-body-md text-on-surface mt-1">{result.summary || result.generated?.summary}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-label-sm rounded-full">
                    {(result.category || result.generated?.category || 'Regional')}
                  </span>
                  {result.comuna && (
                    <span className="px-3 py-1 bg-surface-container-highest text-on-surface text-label-sm rounded-full">
                      📍 {result.comuna}
                    </span>
                  )}
                </div>
                {result.tags && result.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-label-sm rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline explanation */}
      <div className="mt-stack-lg bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
        <div className="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/50">
          <h2 className="text-headline-md font-headline-md text-primary">Flujo de IA</h2>
        </div>
        <div className="p-gutter">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center">
            {[
              { icon: 'rss_feed', label: 'Fuente RSS/Web', desc: 'Extracción cada 15 min' },
              { icon: 'arrow_forward', label: '', desc: '', isArrow: true },
              { icon: 'auto_awesome', label: 'IA (Gemini/Demo)', desc: 'Genera título + resumen' },
              { icon: 'arrow_forward', label: '', desc: '', isArrow: true },
              { icon: 'category', label: 'Clasificación', desc: 'Categoría + comuna + etiquetas' },
              { icon: 'arrow_forward', label: '', desc: '', isArrow: true },
              { icon: 'fact_check', label: 'Moderación', desc: 'Admin aprueba/rechaza' },
              { icon: 'arrow_forward', label: '', desc: '', isArrow: true },
              { icon: 'public', label: 'Publicación', desc: 'Web + redes sociales' },
            ].map((step, i) => (
              step.isArrow ? (
                <span key={i} className="material-symbols-outlined text-on-surface-variant text-[20px]">arrow_forward</span>
              ) : (
                <div key={i} className="flex flex-col items-center gap-1 p-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">{step.icon}</span>
                  </div>
                  <span className="text-label-sm font-label-sm text-primary">{step.label}</span>
                  <span className="text-[10px] text-on-surface-variant">{step.desc}</span>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
