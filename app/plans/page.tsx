'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { deletePlan, getUserPlans, type SavedPlanListItem } from '@/lib/planService';

function formatCardDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const shellClass = 'min-h-dvh bg-[#0a0a0f] text-white/90';

export default function PlansPage() {
  const router = useRouter();
  const { currentUser, loading, firebaseReady } = useAuth();
  const [plans, setPlans] = useState<SavedPlanListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!firebaseReady) return;
    if (!currentUser) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    void (async () => {
      setListError(null);
      try {
        const list = await getUserPlans(currentUser.uid);
        if (!cancelled) setPlans(list);
      } catch {
        if (!cancelled) setListError('Planlar yüklenemedi. Firestore kurallarını ve internet bağlantınızı kontrol edin.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, loading, firebaseReady, router]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
      setDeletingId(id);
      try {
        await deletePlan(id);
        setPlans((prev) => prev.filter((p) => p.id !== id));
      } catch {
        setListError('Plan silinemedi.');
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className={`flex min-h-dvh items-center justify-center ${shellClass}`}>
        <p className="text-[14px] text-white/45">Yükleniyor…</p>
      </div>
    );
  }

  if (!firebaseReady) {
    return (
      <div className={`flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center ${shellClass}`}>
        <p className="max-w-md text-[14px] text-white/55">Planlarım için Firebase yapılandırması gerekli (.env.local).</p>
        <Link
          href="/"
          className="text-[14px] font-medium text-[#5dcaa5] underline-offset-2 transition hover:text-[#1d9e75] hover:underline"
        >
          Ana sayfa
        </Link>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`flex min-h-dvh items-center justify-center ${shellClass}`}>
        <p className="text-[14px] text-white/45">Yönlendiriliyor…</p>
      </div>
    );
  }

  return (
    <div className={`min-h-dvh px-4 pb-12 pt-5 sm:px-5 sm:pt-6 ${shellClass}`}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold tracking-tight text-white sm:text-[30px]">Planlarım</h1>
            <p className="mt-1 text-[13px] text-white/45 sm:text-[14px]">Kaydettiğin tatil planları</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 shrink-0 items-center justify-center self-start rounded-[10px] bg-[#1d9e75] px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90 sm:self-auto"
          >
            Yeni Plan
          </Link>
        </div>

        {listError ? (
          <p
            className="mb-4 rounded-[12px] border border-red-500/35 bg-red-950/40 px-3 py-2.5 text-[13px] text-red-200/95"
            role="alert"
          >
            {listError}
          </p>
        ) : null}

        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center sm:py-20">
            <span className="mb-4 text-4xl sm:text-5xl" aria-hidden>
              🗺️
            </span>
            <p className="text-[15px] font-medium text-white/80 sm:text-[16px]">Henüz planın yok</p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-[#1d9e75] px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            >
              İlk planını oluştur →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {plans.map((p) => {
              const hasTitle = Boolean(p.title?.trim());
              const showDestGreen = hasTitle && p.title!.trim() !== p.destination;
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 rounded-[12px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 transition-[box-shadow,border-color,background-color] duration-200 hover:border-white/[0.18] hover:bg-[rgba(255,255,255,0.07)] hover:shadow-[0_0_24px_rgba(29,158,117,0.12)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link href={`/plan?saved=${encodeURIComponent(p.id)}`} className="min-w-0 flex-1 group">
                    <div className="text-[15px] font-bold text-white transition-colors group-hover:text-[#5dcaa5] sm:text-[16px]">
                      {hasTitle ? p.title : p.destination}
                    </div>
                    {showDestGreen ? (
                      <div className="mt-1 text-[13px] font-medium text-[#1d9e75] sm:text-[14px]">{p.destination}</div>
                    ) : null}
                    <div className="mt-1.5 text-[12px] text-white/40 sm:text-[13px]">
                      {formatCardDate(p.startDate)} – {formatCardDate(p.endDate)}
                      {p.createdAt ? ` · ${p.createdAt.toLocaleDateString('tr-TR')}` : ''}
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-2 sm:pl-2">
                    <Link
                      href={`/plan?saved=${encodeURIComponent(p.id)}`}
                      className="inline-flex flex-1 items-center justify-center rounded-[10px] bg-[#1d9e75] px-4 py-2.5 text-center text-[13px] font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none sm:min-w-[88px]"
                    >
                      Aç
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="inline-flex flex-1 items-center justify-center rounded-[10px] border border-red-500/55 bg-transparent px-4 py-2.5 text-[13px] font-semibold text-red-400 transition-colors hover:border-red-500/80 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50 sm:flex-none sm:min-w-[88px]"
                    >
                      {deletingId === p.id ? '…' : 'Sil'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
