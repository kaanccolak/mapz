'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/AuthContext';

type Tab = 'login' | 'signup';

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
};

const panelClass =
  'max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-xl';

const inputClass =
  'w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-[#5dcaa5]/50 focus:ring-1 focus:ring-[#5dcaa5]/30';

const tabBtn = (active: boolean) =>
  `flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors ${
    active ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/70'
  }`;

export function AuthModal({ open, onClose, initialTab = 'login' }: Props) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const resetError = () => setError(null);

  const handleGoogle = async () => {
    resetError();
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google ile giriş başarısız');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetError();
    if (!email.trim() || password.length < 6) {
      setError('Geçerli e-posta ve en az 6 karakter şifre girin.');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onClose();
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('E-posta veya şifre hatalı.');
      } else if (code === 'auth/email-already-in-use') {
        setError('Bu e-posta ile zaten kayıt var.');
      } else if (code === 'auth/weak-password') {
        setError('Şifre çok zayıf.');
      } else {
        setError(err instanceof Error ? err.message : 'İşlem başarısız');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      role="presentation"
    >
      <div
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="auth-modal-title" className="text-[16px] font-semibold text-white">
            Gezle hesabı
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <button type="button" className={tabBtn(tab === 'login')} onClick={() => setTab('login')}>
            Giriş Yap
          </button>
          <button type="button" className={tabBtn(tab === 'signup')} onClick={() => setTab('signup')}>
            Kayıt Ol
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={busy}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/15 bg-white/[0.08] py-2.5 text-[14px] font-medium text-white transition hover:bg-white/12 disabled:opacity-50"
        >
          <span className="text-lg" aria-hidden>
            G
          </span>
          Google ile devam et
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-wide text-white/35">veya e-posta</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-white/50">E-posta</label>
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-white/50">Şifre</label>
            <input
              type="password"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[10px] bg-[#1d9e75] py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {busy ? '…' : tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
      </div>
    </div>
  );
}
