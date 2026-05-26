'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/utils';
import { saveToken } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const apiUrl = getApiUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiUrl}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      saveToken(data.token);
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-margin-mobile">
      <div className="w-full max-w-md">
        <div className="text-center mb-stack-lg">
          <h1 className="text-headline-lg font-headline-lg text-primary">NEXAA</h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            Panel de Administración
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-error-container text-on-error-container text-label-md p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md"
                placeholder="admin@nexaa.cl"
                required
              />
            </div>

            <div>
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-on-primary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-label-sm text-on-surface-variant mt-4">
          Acceso exclusivo para administradores
        </p>
      </div>
    </div>
  );
}
