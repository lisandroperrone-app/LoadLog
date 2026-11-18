import { createEmptyState } from '../data/seedData';
import {
  EntryIconId,
  EquipmentType,
  Exercise,
  ExerciseCategory,
  TrackerState,
  WeeklyEntry,
} from '../types/tracker';
import { formatShortDate, formatWeightValue } from './weight';

const STORAGE_KEY = 'loadlog.tracker.v4';

const VALID_ICONS = new Set<EntryIconId>([
  'failure',
  'step_regression',
  'next_up',
  'next_down',
]);

const VALID_CATEGORIES = new Set<ExerciseCategory>([
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
]);

function normalizeCategory(raw: unknown): ExerciseCategory {
  if (typeof raw === 'string' && VALID_CATEGORIES.has(raw as ExerciseCategory)) {
    return raw as ExerciseCategory;
  }
  if (raw === 'Push') return 'Chest';
  if (raw === 'Pull') return 'Back';
  return 'Chest';
}

function normalizeExercises(rawExercises: unknown[]): Exercise[] {
  return rawExercises
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const rawNotes = Array.isArray(item.notes)
        ? item.notes
            .filter((n): n is string => typeof n === 'string')
            .map((n) => n.trim())
            .filter(Boolean)
        : typeof item.notes === 'string' && item.notes.trim()
        ? [item.notes.trim()]
        : undefined;

      return {
        id: String(item.id ?? `ex-${Date.now().toString(36)}`),
        name: String(item.name ?? 'Exercise'),
        category: normalizeCategory(item.category ?? item.split),
        muscle: String(item.muscle ?? ''),
        equipment: (typeof item.equipment === 'string' ? item.equipment : 'Barbell') as EquipmentType,
        stepIncrementKg: typeof item.stepIncrementKg === 'number' ? item.stepIncrementKg : 2.5,
        notes: rawNotes && rawNotes.length > 0 ? rawNotes : undefined,
        parentExerciseId:
          typeof item.parentExerciseId === 'string' && item.parentExerciseId
            ? item.parentExerciseId
            : undefined,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      };
    });
}

function normalizeEntries(rawEntries: unknown[]): WeeklyEntry[] {
  return rawEntries
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const legacyWeight = typeof item.weightKg === 'number' ? item.weightKg : 0;
      const minW = typeof item.minWeightKg === 'number' ? item.minWeightKg : legacyWeight;
      const maxW = typeof item.maxWeightKg === 'number' ? item.maxWeightKg : legacyWeight;
      const rawIcons = Array.isArray(item.icons)
        ? Array.from(
            new Set(
              item.icons.filter(
                (icon): icon is EntryIconId =>
                  typeof icon === 'string' && VALID_ICONS.has(icon as EntryIconId)
              )
            )
          )
        : undefined;
      return {
        id: String(item.id ?? `${item.exerciseId}__${item.weekId}`),
        exerciseId: String(item.exerciseId ?? ''),
        weekId: String(item.weekId ?? ''),
        minWeightKg: Math.min(minW, maxW),
        maxWeightKg: Math.max(minW, maxW),
        icons: rawIcons && rawIcons.length > 0 ? rawIcons : undefined,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      };
    });
}

export function normalizeTrackerState(parsed: Partial<TrackerState>): TrackerState | null {
  if (
    !parsed ||
    !Array.isArray(parsed.exercises) ||
    !Array.isArray(parsed.weeks) ||
    !Array.isArray(parsed.entries)
  ) {
    return null;
  }
  return {
    exercises: normalizeExercises(parsed.exercises),
    weeks: parsed.weeks,
    entries: normalizeEntries(parsed.entries),
  };
}

export function loadTrackerState(): TrackerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyState();
    }
    const parsed = JSON.parse(raw) as Partial<TrackerState>;
    return normalizeTrackerState(parsed) ?? createEmptyState();
  } catch {
    return createEmptyState();
  }
}

export function saveTrackerState(state: TrackerState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

export function exportStateAsJson(state: TrackerState): void {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  triggerDownload(blob, `loadlog-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportMatrixAsCsv(state: TrackerState): void {
  const escapeCsv = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const entryMap = new Map<string, WeeklyEntry>();
  for (const entry of state.entries) {
    entryMap.set(`${entry.exerciseId}__${entry.weekId}`, entry);
  }

  const headers = [
    'Exercise',
    'Category',
    'Muscle',
    'Equipment',
    ...state.weeks.map((w) => `${formatShortDate(w.startDate)} (Min-Max kg)`),
  ];

  const rows = state.exercises.map((ex) => {
    const weekCells = state.weeks.map((w) => {
      const entry = entryMap.get(`${ex.id}__${w.id}`);
      if (!entry) return '';
      const minStr = formatWeightValue(entry.minWeightKg);
      const maxStr = formatWeightValue(entry.maxWeightKg);
      return minStr === maxStr ? minStr : `${minStr}-${maxStr}`;
    });
    return [ex.name, ex.category, ex.muscle, ex.equipment, ...weekCells].map(escapeCsv).join(',');
  });

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `loadlog-weekly-weights-${new Date().toISOString().slice(0, 10)}.csv`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
