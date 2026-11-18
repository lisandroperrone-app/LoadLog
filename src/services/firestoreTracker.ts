import {
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  EntryIconId,
  EquipmentType,
  Exercise,
  ExerciseCategory,
  TrackerState,
  WeekColumn,
  WeeklyEntry,
} from '../types/tracker';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function toSafeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  if (cleaned && SAFE_ID_REGEX.test(cleaned)) return cleaned;
  return `${fallbackPrefix}-${Date.now().toString(36)}`;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeExerciseNotes(notes?: string[]): string[] | undefined {
  if (!notes || notes.length === 0) return undefined;
  const cleaned = notes
    .map((n) => n.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 30);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function subscribeToUserTracker(
  uid: string,
  onState: (state: TrackerState, meta: { hasWeeksLoaded: boolean }) => void
): () => void {
  let exercises: Exercise[] = [];
  let weeks: WeekColumn[] = [];
  let entries: WeeklyEntry[] = [];
  let exercisesLoaded = false;
  let weeksLoaded = false;
  let entriesLoaded = false;

  const emitIfReady = () => {
    if (!exercisesLoaded || !weeksLoaded || !entriesLoaded) return;
    onState({ exercises, weeks, entries }, { hasWeeksLoaded: true });
  };

  const exercisesPath = `users/${uid}/exercises`;
  const weeksPath = `users/${uid}/weeks`;
  const entriesPath = `users/${uid}/entries`;

  const unsubExercises = onSnapshot(
    query(collection(db, 'users', uid, 'exercises'), where('ownerId', '==', uid)),
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        const orderIndex = typeof data.orderIndex === 'number' ? data.orderIndex : 0;
        const rawNotes = Array.isArray(data.notes)
          ? data.notes.filter((n): n is string => typeof n === 'string')
          : undefined;
        const ex: Exercise & { _orderIndex: number } = {
          id: d.id,
          name: String(data.name ?? 'Exercise'),
          category: (data.category ?? 'Chest') as ExerciseCategory,
          muscle: String(data.muscle ?? ''),
          equipment: (data.equipment ?? 'Barbell') as EquipmentType,
          stepIncrementKg: typeof data.stepIncrementKg === 'number' ? data.stepIncrementKg : 2.5,
          notes: rawNotes && rawNotes.length > 0 ? rawNotes : undefined,
          parentExerciseId:
            typeof data.parentExerciseId === 'string' && data.parentExerciseId
              ? data.parentExerciseId
              : undefined,
          createdAt: toIsoString(data.createdAt),
          _orderIndex: orderIndex,
        };
        return ex;
      });
      list.sort((a, b) => a._orderIndex - b._orderIndex);
      exercises = list.map(({ _orderIndex: _, ...rest }) => rest);
      exercisesLoaded = true;
      emitIfReady();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, exercisesPath)
  );

  const unsubWeeks = onSnapshot(
    query(collection(db, 'users', uid, 'weeks'), where('ownerId', '==', uid)),
    (snapshot) => {
      const list: WeekColumn[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          startDate: String(data.startDate ?? ''),
        };
      });
      list.sort((a, b) => a.startDate.localeCompare(b.startDate));
      weeks = list;
      weeksLoaded = true;
      emitIfReady();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, weeksPath)
  );

  const unsubEntries = onSnapshot(
    query(collection(db, 'users', uid, 'entries'), where('ownerId', '==', uid)),
    (snapshot) => {
      entries = snapshot.docs.map((d) => {
        const data = d.data();
        const rawIcons = Array.isArray(data.icons)
          ? (data.icons.filter((i): i is EntryIconId => typeof i === 'string') as EntryIconId[])
          : undefined;
        return {
          id: d.id,
          exerciseId: String(data.exerciseId ?? ''),
          weekId: String(data.weekId ?? ''),
          minWeightKg: typeof data.minWeightKg === 'number' ? data.minWeightKg : 0,
          maxWeightKg: typeof data.maxWeightKg === 'number' ? data.maxWeightKg : 0,
          icons: rawIcons && rawIcons.length > 0 ? rawIcons : undefined,
          notes: typeof data.notes === 'string' && data.notes ? data.notes : undefined,
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      entriesLoaded = true;
      emitIfReady();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, entriesPath)
  );

  return () => {
    unsubExercises();
    unsubWeeks();
    unsubEntries();
  };
}

export async function saveWeeksBatch(uid: string, weeks: WeekColumn[]): Promise<void> {
  if (weeks.length === 0) return;
  const path = `users/${uid}/weeks`;
  try {
    const batch = writeBatch(db);
    for (const wk of weeks) {
      const weekId = toSafeId(wk.id, 'wk');
      batch.set(doc(db, 'users', uid, 'weeks', weekId), {
        startDate: wk.startDate.slice(0, 10),
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createExerciseDoc(
  uid: string,
  exercise: Exercise,
  orderIndex: number
): Promise<void> {
  const exerciseId = toSafeId(exercise.id, 'ex');
  const path = `users/${uid}/exercises/${exerciseId}`;
  try {
    const cleanNotes = sanitizeExerciseNotes(exercise.notes);
    const payload: Record<string, unknown> = {
      name: exercise.name.trim().slice(0, 120) || 'Exercise',
      category: exercise.category,
      muscle: exercise.muscle.trim().slice(0, 120),
      equipment: exercise.equipment,
      stepIncrementKg: Math.min(100, Math.max(0.25, exercise.stepIncrementKg || 2.5)),
      orderIndex: Math.min(10000, Math.max(0, orderIndex)),
      ownerId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (cleanNotes) {
      payload.notes = cleanNotes;
    }
    if (exercise.parentExerciseId) {
      payload.parentExerciseId = toSafeId(exercise.parentExerciseId, 'ex');
    }
    await setDoc(doc(db, 'users', uid, 'exercises', exerciseId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateExerciseNotesDoc(
  uid: string,
  exerciseId: string,
  notes: string[] | undefined
): Promise<void> {
  const path = `users/${uid}/exercises/${exerciseId}`;
  try {
    const cleanNotes = sanitizeExerciseNotes(notes);
    await updateDoc(doc(db, 'users', uid, 'exercises', exerciseId), {
      notes: cleanNotes ? cleanNotes : deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function promoteAlternativeDocs(
  uid: string,
  oldParentId: string,
  oldParentOrderIndex: number,
  alternativeId: string,
  altOrderIndex: number,
  siblingIds: string[]
): Promise<void> {
  const path = `users/${uid}/exercises`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'exercises', alternativeId), {
      parentExerciseId: deleteField(),
      orderIndex: oldParentOrderIndex,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', uid, 'exercises', oldParentId), {
      parentExerciseId: alternativeId,
      orderIndex: altOrderIndex,
      updatedAt: serverTimestamp(),
    });
    for (const sibId of siblingIds) {
      batch.update(doc(db, 'users', uid, 'exercises', sibId), {
        parentExerciseId: alternativeId,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAlternativeDocs(
  uid: string,
  alternativeId: string,
  entryIdsToDelete: string[]
): Promise<void> {
  const path = `users/${uid}/exercises/${alternativeId}`;
  try {
    const batch = writeBatch(db);
    for (const entryId of entryIdsToDelete) {
      batch.delete(doc(db, 'users', uid, 'entries', entryId));
    }
    batch.delete(doc(db, 'users', uid, 'exercises', alternativeId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertEntryDoc(
  uid: string,
  entry: Omit<WeeklyEntry, 'id' | 'updatedAt'>,
  isExisting: boolean
): Promise<void> {
  const entryId = `${toSafeId(entry.exerciseId, 'ex')}__${toSafeId(entry.weekId, 'wk')}`;
  const path = `users/${uid}/entries/${entryId}`;
  const minW = Math.min(2000, Math.max(0, entry.minWeightKg));
  const maxW = Math.min(2000, Math.max(minW, entry.maxWeightKg));
  const cleanIcons =
    entry.icons && entry.icons.length > 0 ? Array.from(new Set(entry.icons)).slice(0, 4) : undefined;
  const cleanNotes = entry.notes?.trim().slice(0, 200) || undefined;

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'users', uid, 'entries', entryId), {
        minWeightKg: minW,
        maxWeightKg: maxW,
        icons: cleanIcons ? cleanIcons : deleteField(),
        notes: cleanNotes ? cleanNotes : deleteField(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload: Record<string, unknown> = {
        exerciseId: toSafeId(entry.exerciseId, 'ex'),
        weekId: toSafeId(entry.weekId, 'wk'),
        minWeightKg: minW,
        maxWeightKg: maxW,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (cleanIcons) payload.icons = cleanIcons;
      if (cleanNotes) payload.notes = cleanNotes;
      await setDoc(doc(db, 'users', uid, 'entries', entryId), payload);
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteEntryDoc(
  uid: string,
  exerciseId: string,
  weekId: string
): Promise<void> {
  const entryId = `${toSafeId(exerciseId, 'ex')}__${toSafeId(weekId, 'wk')}`;
  const path = `users/${uid}/entries/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'entries', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function replaceTrackerStateDocs(
  uid: string,
  currentState: TrackerState,
  nextState: TrackerState
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const deleteOps: Array<{ col: 'entries' | 'exercises' | 'weeks'; id: string }> = [
      ...currentState.entries.map((e) => ({ col: 'entries' as const, id: e.id })),
      ...currentState.exercises.map((e) => ({ col: 'exercises' as const, id: e.id })),
      ...currentState.weeks.map((w) => ({ col: 'weeks' as const, id: w.id })),
    ];

    for (let i = 0; i < deleteOps.length; i += 400) {
      const chunk = deleteOps.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.delete(doc(db, 'users', uid, item.col, item.id));
      }
      await batch.commit();
    }

    const writeOps: Array<() => { ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [
      ...nextState.weeks.map((wk) => () => ({
        ref: doc(db, 'users', uid, 'weeks', toSafeId(wk.id, 'wk')),
        data: {
          startDate: wk.startDate.slice(0, 10),
          ownerId: uid,
          createdAt: serverTimestamp(),
        },
      })),
      ...nextState.exercises.map((ex, idx) => () => {
        const cleanNotes = sanitizeExerciseNotes(ex.notes);
        const data: Record<string, unknown> = {
          name: ex.name.trim().slice(0, 120) || 'Exercise',
          category: ex.category,
          muscle: ex.muscle.trim().slice(0, 120),
          equipment: ex.equipment,
          stepIncrementKg: Math.min(100, Math.max(0.25, ex.stepIncrementKg || 2.5)),
          orderIndex: idx,
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (cleanNotes) data.notes = cleanNotes;
        if (ex.parentExerciseId) data.parentExerciseId = toSafeId(ex.parentExerciseId, 'ex');
        return {
          ref: doc(db, 'users', uid, 'exercises', toSafeId(ex.id, 'ex')),
          data,
        };
      }),
      ...nextState.entries.map((en) => () => {
        const minW = Math.min(2000, Math.max(0, en.minWeightKg));
        const maxW = Math.min(2000, Math.max(minW, en.maxWeightKg));
        const cleanIcons =
          en.icons && en.icons.length > 0 ? Array.from(new Set(en.icons)).slice(0, 4) : undefined;
        const cleanNotes = en.notes?.trim().slice(0, 200) || undefined;
        const data: Record<string, unknown> = {
          exerciseId: toSafeId(en.exerciseId, 'ex'),
          weekId: toSafeId(en.weekId, 'wk'),
          minWeightKg: minW,
          maxWeightKg: maxW,
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (cleanIcons) data.icons = cleanIcons;
        if (cleanNotes) data.notes = cleanNotes;
        return {
          ref: doc(db, 'users', uid, 'entries', toSafeId(en.id, 'entry')),
          data,
        };
      }),
    ];

    for (let i = 0; i < writeOps.length; i += 400) {
      const chunk = writeOps.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const build of chunk) {
        const { ref, data } = build();
        batch.set(ref, data);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
