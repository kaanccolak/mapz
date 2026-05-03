/**
 * Firestore plan kaydı.
 *
 * Güvenlik kuralları (Firebase Console örneği):
 * - plans: create/update/delete yalnızca auth.uid == userId; read aynı
 * - sharedPlans: read herkese açık (get); write yalnızca giriş yapmış kullanıcı (veya sadece create)
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import type { PdfExpenses } from '@/components/PdfExport';
import type { ReservationData } from '@/components/ReservationModal';
import { getFirestoreDb } from '@/lib/firebase';
import type { PlanRequest, PlanPeople, TripPlan } from '@/types';

export type FirestorePlanPayload = {
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  groupType: PlanPeople;
  budget: string;
  planData: TripPlan;
  requestSnapshot: PlanRequest;
  reservationData: ReservationData | null;
  expenseData: PdfExpenses | null;
  shareId: string;
  createdAt: Timestamp | null;
};

export type SavedPlanListItem = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt: Date | null;
  shareId: string;
};

function randomShareId(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Firestore nested undefined kabul etmez. JSON ile undefined alanlar atılır;
 * dizideki undefined öğeler null olur.
 */
function stripUndefinedForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function savePlan(
  userId: string,
  input: {
    plan: TripPlan;
    request: PlanRequest;
    reservationData: ReservationData | null;
    expenseData: PdfExpenses | null;
    existingPlanId?: string | null;
    existingShareId?: string | null;
  },
): Promise<{ planId: string; shareId: string }> {
  const db = getFirestoreDb();
  const planId =
    input.existingPlanId && input.existingPlanId.trim() !== ''
      ? input.existingPlanId.trim()
      : doc(collection(db, 'plans')).id;
  const shareId =
    input.existingShareId && input.existingShareId.trim() !== ''
      ? input.existingShareId.trim()
      : randomShareId();

  const title =
    input.plan.tripTitle?.trim() ||
    `${input.request.destination} · ${input.request.startDate} – ${input.request.endDate}`;

  const planData = stripUndefinedForFirestore(input.plan);
  const requestSnapshot = stripUndefinedForFirestore(input.request);
  const reservationData =
    input.reservationData === null ? null : stripUndefinedForFirestore(input.reservationData);
  const expenseData =
    input.expenseData === null ? null : stripUndefinedForFirestore(input.expenseData);

  const planDoc = {
    userId,
    title,
    destination: input.request.destination,
    startDate: input.request.startDate,
    endDate: input.request.endDate,
    groupType: input.request.people,
    budget: input.request.budget,
    planData,
    requestSnapshot,
    reservationData,
    expenseData,
    shareId,
    updatedAt: serverTimestamp(),
    ...(input.existingPlanId ? {} : { createdAt: serverTimestamp() }),
  };

  const sharedRef = doc(db, 'sharedPlans', shareId);
  const sharedPayload = {
    userId,
    planId,
    title,
    destination: input.request.destination,
    startDate: input.request.startDate,
    endDate: input.request.endDate,
    groupType: input.request.people,
    budget: input.request.budget,
    planData,
    requestSnapshot,
    reservationData,
    expenseData,
    updatedAt: serverTimestamp(),
    ...(input.existingPlanId ? {} : { createdAt: serverTimestamp() }),
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'plans', planId), planDoc, { merge: true });
  batch.set(sharedRef, sharedPayload, { merge: true });
  await batch.commit();

  return { planId, shareId };
}

export async function getUserPlans(userId: string): Promise<SavedPlanListItem[]> {
  const db = getFirestoreDb();
  let snap;
  try {
    const q = query(
      collection(db, 'plans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    snap = await getDocs(q);
  } catch {
    const q2 = query(collection(db, 'plans'), where('userId', '==', userId), limit(50));
    snap = await getDocs(q2);
  }
  const items = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const created = x.createdAt as Timestamp | undefined;
    return {
      id: d.id,
      title: String(x.title ?? ''),
      destination: String(x.destination ?? ''),
      startDate: String(x.startDate ?? ''),
      endDate: String(x.endDate ?? ''),
      createdAt: created?.toDate?.() ?? null,
      shareId: String(x.shareId ?? ''),
    };
  });
  items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  return items;
}

function mapPlanDocToPayload(x: Record<string, unknown>, shareIdFallback: string): FirestorePlanPayload {
  return {
    userId: String(x.userId ?? ''),
    title: String(x.title ?? ''),
    destination: String(x.destination ?? ''),
    startDate: String(x.startDate ?? ''),
    endDate: String(x.endDate ?? ''),
    groupType: x.groupType as PlanPeople,
    budget: String(x.budget ?? ''),
    planData: x.planData as TripPlan,
    requestSnapshot: x.requestSnapshot as PlanRequest,
    reservationData: (x.reservationData as ReservationData) ?? null,
    expenseData: (x.expenseData as PdfExpenses) ?? null,
    shareId: String(x.shareId ?? shareIdFallback),
    createdAt: (x.createdAt as Timestamp) ?? null,
  };
}

export async function getPlan(planId: string): Promise<FirestorePlanPayload | null> {
  const db = getFirestoreDb();
  const ref = doc(db, 'plans', planId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const x = snap.data() as Record<string, unknown>;
  return mapPlanDocToPayload(x, String(x.shareId ?? ''));
}

/** `plans` içinde `shareId` eşleşen belge; yoksa `sharedPlans` yedek (eski kayıtlar). */
export async function getPlanByShareId(shareId: string): Promise<FirestorePlanPayload | null> {
  const trimmed = shareId.trim();
  if (!trimmed) return null;
  const db = getFirestoreDb();
  try {
    const q = query(collection(db, 'plans'), where('shareId', '==', trimmed), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const x = snap.docs[0].data() as Record<string, unknown>;
      return mapPlanDocToPayload(x, trimmed);
    }
  } catch {
    /* index / ağ; sharedPlans’a düş */
  }
  return getSharedPlan(trimmed);
}

export async function getSharedPlan(shareId: string): Promise<FirestorePlanPayload | null> {
  const db = getFirestoreDb();
  const ref = doc(db, 'sharedPlans', shareId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const x = snap.data() as Record<string, unknown>;
  return {
    userId: String(x.userId ?? ''),
    title: String(x.title ?? ''),
    destination: String(x.destination ?? ''),
    startDate: String(x.startDate ?? ''),
    endDate: String(x.endDate ?? ''),
    groupType: (x.groupType as PlanPeople) ?? 'cift',
    budget: String(x.budget ?? ''),
    planData: x.planData as TripPlan,
    requestSnapshot: x.requestSnapshot as PlanRequest,
    reservationData: (x.reservationData as ReservationData) ?? null,
    expenseData: (x.expenseData as PdfExpenses) ?? null,
    shareId,
    createdAt: (x.createdAt as Timestamp) ?? null,
  };
}

export async function deletePlan(planId: string): Promise<void> {
  const db = getFirestoreDb();
  const p = await getPlan(planId);
  const batch = writeBatch(db);
  batch.delete(doc(db, 'plans', planId));
  if (p?.shareId) {
    batch.delete(doc(db, 'sharedPlans', p.shareId));
  }
  await batch.commit();
}
