'use client';

import { useState } from 'react';
import { HeroSearch } from '@/components/HeroSearch';

export default function Home() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#0a0a0f]">
      <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:pt-10">
        <div
          className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#1d9e75]/20 blur-[120px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-[#3b82f6]/15 blur-[100px]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 text-[12px] font-normal text-[#5dcaa5]">
            <span className="text-[#5dcaa5]">●</span> Yapay zeka destekli seyahat planlayıcı
          </p>
          <h1 className="text-balance text-[42px] font-medium leading-tight tracking-tight text-white">
            Hayalindeki tatili saniyeler içinde planla
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] font-normal text-white/70">
            Nereye gittiğini söyle, gerisini biz halledelim.
          </p>

          <div className="mt-12 text-left">
            <HeroSearch onError={(msg) => setError(msg)} />
          </div>

          {error ? (
            <p className="mt-4 text-center text-[14px] text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
