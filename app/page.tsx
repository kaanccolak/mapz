'use client';

import { useState } from 'react';
import { HeroSearch } from '@/components/HeroSearch';

export default function Home() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white font-sans text-[#0a0a0f]">
      <section className="relative overflow-hidden bg-[#0a0a0f] px-4 pb-24 pt-8 sm:pt-14">
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

      <section className="border-b border-[#e5e7eb] px-4 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-[15px] font-medium text-[#0a0a0f]">Harita üzerinde rota</h2>
            <p className="mt-2 text-[16px] font-normal leading-relaxed text-[#6b7280]">
              Her aktivite haritada, en verimli rota otomatik
            </p>
          </div>
          <div>
            <h2 className="text-[15px] font-medium text-[#0a0a0f]">Gün gün dolu program</h2>
            <p className="mt-2 text-[16px] font-normal leading-relaxed text-[#6b7280]">
              Sabahtan akşama 4-5 aktivite, boş dakika kalmaz
            </p>
          </div>
          <div>
            <h2 className="text-[15px] font-medium text-[#0a0a0f]">Otel & uçak bul</h2>
            <p className="mt-2 text-[16px] font-normal leading-relaxed text-[#6b7280]">
              Bütçene göre Booking ve Skyscanner entegrasyonu
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f8f7] px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-[15px] font-medium text-[#0a0a0f]">
            Nasıl çalışır?
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '1', title: 'Nereye?' },
              { step: '2', title: 'Yapay zeka planlar' },
              { step: '3', title: 'Düzenle' },
              { step: '4', title: 'Rezervasyon yap' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[12px] font-medium text-[#1d9e75] shadow-none ring-1 ring-[#e5e7eb]">
                  {item.step}
                </span>
                <p className="mt-3 text-[15px] font-medium text-[#0a0a0f]">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#0a0a0f] px-4 py-10 text-center text-[12px] text-white/50">
        © 2025 Gezle
      </footer>
    </div>
  );
}
