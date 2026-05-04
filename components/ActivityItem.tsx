'use client';

import type { Activity, ActivityType } from '@/types';

const typeLabels: Record<ActivityType, string> = {
  gezi: 'Gezi',
  yemek: 'Yemek',
  kafe: 'Kafe',
  aktif: 'Aktif',
  custom: 'Senin ekleme',
};

const typeBadgeColors: Record<ActivityType, string> = {
  gezi: '#185FA5',
  yemek: '#D85A30',
  kafe: '#1D9E75',
  aktif: '#7F77DD',
  custom: '#a855f7',
};

type ActivityItemProps = {
  activityIndex: number;
  sequence: number;
  activity: Activity;
  activityId: string;
  removed: boolean;
  selected: boolean;
  /** Bilet yokken ilk/son günde saat sütununu gizle */
  suppressTimes?: boolean;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  /** Mobil planda haritaya geçiş ipucu */
  showMapOnMobileHint?: boolean;
  readOnly?: boolean;
};

export function ActivityItem({
  activityIndex,
  sequence,
  activity,
  activityId,
  removed,
  selected,
  suppressTimes = false,
  onSelect,
  onRemove,
  onRestore,
  showMapOnMobileHint = false,
  readOnly = false,
}: ActivityItemProps) {
  const badgeBg = typeBadgeColors[activity.type] ?? '#888780';
  const showTime =
    !suppressTimes && activity.time != null && String(activity.time).trim() !== '';
  const typeLabel = typeLabels[activity.type];
  const descText = activity.description?.trim() ?? '';
  const showTypeBadge =
    Boolean(typeLabel) &&
    !(activity.type === 'custom' && activity.isManual === true && !descText);

  return (
    <div
      role={removed ? undefined : 'button'}
      tabIndex={removed ? undefined : 0}
      onClick={() => {
        if (!removed) onSelect(activityIndex);
      }}
      onKeyDown={(e) => {
        if (removed) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(activityIndex);
        }
      }}
      className={`group relative flex items-start gap-3 rounded-[12px] border border-[#e5e7eb] bg-white py-2 pl-3 pr-2 outline-none transition-[border-color] md:pr-3 ${
        removed ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-[#fafafa]'
      } ${selected ? 'border-l-[3px] border-solid' : ''}`}
      style={
        selected
          ? { borderLeftColor: badgeBg }
          : undefined
      }
    >
      <div
        className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full border-2 border-white px-1 text-[11px] font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
        style={{ background: badgeBg }}
        aria-hidden
      >
        {sequence}
      </div>
      {showTime ? (
        <div className="w-12 shrink-0 text-[11px] font-medium text-[#6b7280]">{activity.time}</div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-medium leading-snug text-[#0a0a0f] ${removed ? 'line-through' : ''}`}>
          {activity.name}
        </div>
        {descText ? (
          <p className={`mt-0.5 text-[11px] leading-relaxed text-[#6b7280] ${removed ? 'line-through' : ''}`}>
            {descText}
          </p>
        ) : null}
        {showTypeBadge ? (
          <span className="mt-1 inline-block rounded-full bg-[#f8f8f7] px-2 py-0.5 text-[11px] leading-none text-[#0a0a0f]">
            {typeLabel}
          </span>
        ) : null}
      </div>
      {showMapOnMobileHint && !removed ? (
        <span
          className="pointer-events-none absolute right-10 top-2 select-none text-[13px] opacity-40 md:hidden"
          title="Haritada göster"
          aria-hidden
        >
          🗺️
        </span>
      ) : null}
      {!readOnly ? (
        <div className="relative z-[1] flex shrink-0 flex-col items-end gap-1">
          {!removed ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(activityId);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] opacity-0 transition-opacity hover:bg-[#f8f8f7] hover:text-[#0a0a0f] group-hover:opacity-100 focus:opacity-100"
              aria-label="Aktiviteyi kaldır"
            >
              ×
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestore(activityId);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1d9e75] hover:bg-[#f8f8f7]"
              aria-label="Geri yükle"
            >
              ↩
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
