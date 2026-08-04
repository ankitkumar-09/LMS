'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // NEXT_PUBLIC_* values are inlined at BUILD time. If the variable was added to
  // Vercel after the last deploy, this is undefined and every password fails —
  // which is indistinguishable from a wrong password unless we check separately.
  const configuredPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  const isConfigured = Boolean(configuredPassword);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isConfigured) {
      setError(
        'Admin password is not configured on this deployment. Add NEXT_PUBLIC_ADMIN_PASSWORD in your hosting environment variables, then redeploy.'
      );
      setLoading(false);
      return;
    }

    if (password === configuredPassword) {
      sessionStorage.setItem('admin_authenticated', 'true');
      router.push('/admin/dashboard');
    } else {
      setError('Invalid password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] relative flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute -top-32 -left-24 w-[38rem] h-[38rem] rounded-full bg-indigo-200/40 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-24 w-[32rem] h-[32rem] rounded-full bg-sky-200/40 blur-[120px] pointer-events-none" />
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-[#1a237e]/10 text-[#1a237e] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your master password to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-password" className="admin-label">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="admin-input py-2.5"
              autoFocus
            />
          </div>

          {!isConfigured && !error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-lg text-xs leading-relaxed">
              Heads up: no admin password is set in this build, so login can&apos;t succeed.
              Set <code className="font-mono">NEXT_PUBLIC_ADMIN_PASSWORD</code> and redeploy.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !password} className="btn btn-primary w-full py-2.5">
            {loading ? 'Verifying…' : 'Log in'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-[#1565c0] transition-colors">
            ← Back to Test Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
