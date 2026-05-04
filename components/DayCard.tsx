'use client';

import type { Day } from '@/types';
import { ActivityItem } from './ActivityItem';

type DayCardProps = {
  day: Day;
  dayIndex: number;
  totalDays: number;
  hasTicket: boolean;
  removedIds: Set<string>;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  selectedActivityIndex: number | null;
  onActivitySelect: (index: number) => void;
  /** Dar ekranda kartta harita ipucu (🗺️) */
  showMapOnMobileHint?: boolean;
  /** Paylaşım görünümü: kaldır/geri yükle gizlenir */
  readOnly?: boolean;
  /** Manuel aktivite ekleme modalını aç */
  onOpenManualAdd?: () => void;
};

function activityId(dayNumber: number, index: number) {
  return `${dayNumber}-${index}`;
}

export function DayCard({
  day,
  dayIndex,
  totalDays,
  hasTicket,
  removedIds,
  onRemove,
  onRestore,
  selectedActivityIndex,
  onActivitySelect,
  showMapOnMobileHint = false,
  readOnly = false,
  onOpenManualAdd,
}: DayCardProps) {
  const suppressTimes = !hasTicket && (dayIndex === 0 || dayIndex === totalDays - 1);

  return (
    <div className="flex flex-col [&>*]:mb-1.5 [&>*:last-child]:mb-0">
      {day.activities.map((activity, index) => {
        const id = activity.id?.trim() || activityId(day.dayNumber, index);
        return (
          <ActivityItem
            key={id}
            activityIndex={index}
            sequence={index + 1}
            activity={activity}
            activityId={id}
            removed={removedIds.has(id)}
            selected={selectedActivityIndex === index}
            suppressTimes={suppressTimes}
            onSelect={onActivitySelect}
            onRemove={onRemove}
            onRestore={onRestore}
            showMapOnMobileHint={showMapOnMobileHint}
            readOnly={readOnly}
          />
        );
      })}
      {onOpenManualAdd && !readOnly ? (
        <button
          type="button"
          onClick={onOpenManualAdd}
          className="mt-1 w-full rounded-xl border border-dashed border-[#0a0a0f]/25 bg-transparent py-2.5 text-center text-[12px] font-medium text-[#6b7280] transition hover:border-[#1d9e75]/45 hover:bg-[#f8f8f7] hover:text-[#0a0a0f]"
        >
          + Aktivite Ekle
        </button>
      ) : null}
    </div>
  );
}
