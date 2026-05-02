'use client';

import type { Activity, ActivityType } from '@/types';

const typeLabels: Record<ActivityType, string> = {
  gezi: 'Gezi',
  yemek: 'Yemek',
  kafe: 'Kafe',
  aktif: 'Aktif',
};

const typeBadgeColors: Record<ActivityType, string> = {
  gezi: '#185FA5',
  yemek: '#D85A30',
  kafe: '#1D9E75',
  aktif: '#7F77DD',
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
}: ActivityItemProps) {
  const badgeBg = typeBadgeColors[activity.type] ?? '#888780';
  const showTime =
    !suppressTimes && activity.time != null && String(activity.time).trim() !== '';

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
      className={`group relative flex gap-3 rounded-[12px] border border-[#e5e7eb] bg-white px-3 py-3 outline-none transition-[border-color] ${
        removed ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-[#fafafa]'
      } ${selected ? 'border-l-[3px] border-solid' : ''}`}
      style={
        selected
          ? { borderLeftColor: badgeBg }
          : undefined
      }
    >
      <div
        className="flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-full border-2 border-white px-1 text-[12px] font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
        style={{ background: badgeBg }}
        aria-hidden
      >
        {sequence}
      </div>
      {showTime ? (
        <div className="w-12 shrink-0 text-[12px] font-medium text-[#6b7280]">{activity.time}</div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] font-medium text-[#0a0a0f] ${removed ? 'line-through' : ''}`}>
          {activity.name}
        </div>
        <p className={`mt-0.5 text-[12px] leading-relaxed text-[#6b7280] ${removed ? 'line-through' : ''}`}>
          {activity.description}
        </p>
        <span className="mt-2 inline-block rounded-full bg-[#f8f8f7] px-2 py-0.5 text-[12px] text-[#0a0a0f]">
          {typeLabels[activity.type]}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
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
    </div>
  );
}
