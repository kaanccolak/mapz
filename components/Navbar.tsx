'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/lib/AuthContext';

export function Navbar() {
  const { currentUser, loading, firebaseReady, signOut } = useAuth();
  const pathname = usePathname();
  const [authOpen, setAuthOpen] = useState(false);

  const onPlans = pathname?.startsWith('/plans');

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-[1500] border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            className="text-[17px] font-semibold tracking-tight text-white transition hover:text-[#5dcaa5]"
          >
            Gidiyom
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            {loading ? (
              <span className="text-[12px] text-white/35">…</span>
            ) : !firebaseReady ? (
              <span className="max-w-[160px] text-right text-[10px] leading-tight text-white/40 sm:text-[11px]">
                Firebase anahtarları eksik (.env.local)
              </span>
            ) : currentUser ? (
              <>
                <Link
                  href="/plans"
                  className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition sm:px-3 ${
                    onPlans ? 'bg-white/10 text-[#5dcaa5]' : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Planlarım
                </Link>
                <span className="hidden max-w-[120px] truncate text-[12px] text-white/45 sm:inline" title={currentUser.email ?? ''}>
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[12px] font-medium text-white/70 transition hover:border-white/25 hover:text-white sm:px-3 sm:text-[13px]"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-[#1d9e75] px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#178f68] sm:px-4"
              >
                Giriş Yap
              </button>
            )}
          </nav>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
