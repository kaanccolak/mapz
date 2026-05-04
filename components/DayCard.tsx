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
}: DayCardProps) {
  const suppressTimes = !hasTicket && (dayIndex === 0 || dayIndex === totalDays - 1);

  return (
    <div className="flex flex-col [&>*]:mb-1.5 [&>*:last-child]:mb-0">
      {day.activities.map((activity, index) => {
        const id = activityId(day.dayNumber, index);
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
    </div>
  );
}
