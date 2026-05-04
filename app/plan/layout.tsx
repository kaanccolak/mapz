import { PlanBodyLock } from '@/app/plan/PlanBodyLock';

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlanBodyLock />
      {/* Navbar fixed h-14 (pt-14 Providers ile); içerik alanı kalan viewport */}
      <div className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full min-h-0 flex-col overflow-hidden">
        {children}
      </div>
    </>
  );
}
