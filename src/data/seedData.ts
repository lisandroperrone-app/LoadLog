import { Exercise, TrackerState, WeekColumn, WeeklyEntry } from '../types/tracker';
import { addDaysIso, getIsoWeekId, getMondayOfIsoWeek } from '../utils/weight';

const CYCLE_START_MONDAY = '2026-09-28';

export function buildWeeks(count: number, startMonday = CYCLE_START_MONDAY): WeekColumn[] {
  const weeks: WeekColumn[] = [];
  for (let i = 0; i < count; i++) {
    const startDate = addDaysIso(startMonday, i * 7);
    weeks.push({
      id: getIsoWeekId(startDate),
      startDate,
    });
  }
  return weeks;
}

export const STARTER_EXERCISES: Exercise[] = [
  {
    id: 'ex-bench-press',
    name: 'Barbell Bench Press',
    category: 'Chest',
    muscle: 'Mid Chest',
    equipment: 'Barbell',
    stepIncrementKg: 2.5,
    createdAt: '2026-09-28T08:00:00Z',
  },
  {
    id: 'ex-incline-db',
    name: 'Incline Dumbbell Press',
    category: 'Chest',
    muscle: 'Upper Chest',
    equipment: 'Dumbbell',
    stepIncrementKg: 2,
    createdAt: '2026-09-28T08:05:00Z',
  },
  {
    id: 'ex-ohp',
    name: 'Overhead Barbell Press',
    category: 'Shoulders',
    muscle: 'Front & Side Delts',
    equipment: 'Barbell',
    stepIncrementKg: 2.5,
    createdAt: '2026-09-28T08:10:00Z',
  },
  {
    id: 'ex-barbell-row',
    name: 'Pendlay Barbell Row',
    category: 'Back',
    muscle: 'Upper Back',
    equipment: 'Barbell',
    stepIncrementKg: 2.5,
    createdAt: '2026-09-28T08:15:00Z',
  },
  {
    id: 'ex-lat-pulldown',
    name: 'Weighted Lat Pulldown',
    category: 'Back',
    muscle: 'Lats',
    equipment: 'Cable',
    stepIncrementKg: 2.5,
    createdAt: '2026-09-28T08:20:00Z',
  },
  {
    id: 'ex-back-squat',
    name: 'High-Bar Back Squat',
    category: 'Legs',
    muscle: 'Quads & Glutes',
    equipment: 'Barbell',
    stepIncrementKg: 2.5,
    createdAt: '2026-09-28T08:25:00Z',
  },
  {
    id: 'ex-rdl',
    name: 'Romanian Deadlift',
    category: 'Legs',
    muscle: 'Hamstrings',
    equipment: 'Barbell',
    stepIncrementKg: 5,
    createdAt: '2026-09-28T08:30:00Z',
  },
  {
    id: 'ex-ez-curl',
    name: 'EZ-Bar Bicep Curl',
    category: 'Arms',
    muscle: 'Biceps',
    equipment: 'Barbell',
    stepIncrementKg: 2.5,
    createdAt: '2026-09-28T08:35:00Z',
  },
];

export function createStarterState(): TrackerState {
  // 9 weeks: 8 logged weeks (Sep 28 - Nov 16) + 1 upcoming blank week (Nov 23) ready to scroll/log
  const weeks = buildWeeks(9, CYCLE_START_MONDAY);

  // [exerciseId, weekIndex, minWeightKg, maxWeightKg, notes?]
  const rawLogs: Array<[string, number, number, number, string?]> = [
    ['ex-bench-press', 0, 60, 75],
    ['ex-bench-press', 1, 62.5, 77.5],
    ['ex-bench-press', 2, 65, 77.5],
    ['ex-bench-press', 3, 65, 80],
    ['ex-bench-press', 4, 67.5, 80],
    ['ex-bench-press', 5, 60, 70, 'Planned deload week'],
    ['ex-bench-press', 6, 70, 82.5],
    ['ex-bench-press', 7, 72.5, 85, 'New personal record'],

    ['ex-incline-db', 0, 22, 26],
    ['ex-incline-db', 1, 22, 28],
    ['ex-incline-db', 2, 24, 28],
    ['ex-incline-db', 3, 24, 28],
    ['ex-incline-db', 4, 26, 30],
    ['ex-incline-db', 5, 20, 24],
    ['ex-incline-db', 6, 26, 30],
    ['ex-incline-db', 7, 26, 32],

    ['ex-ohp', 0, 40, 47.5],
    ['ex-ohp', 1, 40, 50],
    ['ex-ohp', 2, 42.5, 50],
    ['ex-ohp', 3, 42.5, 50],
    ['ex-ohp', 4, 45, 52.5],
    ['ex-ohp', 5, 37.5, 45, 'Deload'],
    ['ex-ohp', 6, 45, 52.5],
    ['ex-ohp', 7, 47.5, 55],

    ['ex-barbell-row', 0, 60, 70],
    ['ex-barbell-row', 1, 60, 72.5],
    ['ex-barbell-row', 2, 62.5, 75],
    ['ex-barbell-row', 3, 65, 75],
    ['ex-barbell-row', 4, 65, 77.5],
    ['ex-barbell-row', 5, 57.5, 67.5],
    ['ex-barbell-row', 6, 67.5, 80],
    ['ex-barbell-row', 7, 70, 80],

    ['ex-lat-pulldown', 0, 47.5, 57.5],
    ['ex-lat-pulldown', 1, 50, 60],
    ['ex-lat-pulldown', 2, 52.5, 62.5],
    ['ex-lat-pulldown', 3, 52.5, 62.5],
    ['ex-lat-pulldown', 4, 55, 65],
    ['ex-lat-pulldown', 5, 45, 55],
    ['ex-lat-pulldown', 6, 55, 65],
    ['ex-lat-pulldown', 7, 57.5, 67.5],

    ['ex-back-squat', 0, 75, 95],
    ['ex-back-squat', 1, 80, 97.5],
    ['ex-back-squat', 2, 82.5, 100],
    ['ex-back-squat', 3, 85, 102.5],
    ['ex-back-squat', 4, 87.5, 105],
    ['ex-back-squat', 5, 75, 90, 'Deload squat'],
    ['ex-back-squat', 6, 90, 107.5],
    ['ex-back-squat', 7, 92.5, 110, 'Smooth depth'],

    ['ex-rdl', 0, 70, 85],
    ['ex-rdl', 1, 75, 90],
    ['ex-rdl', 2, 75, 90],
    ['ex-rdl', 3, 80, 95],
    ['ex-rdl', 4, 80, 95],
    ['ex-rdl', 5, 70, 80],
    ['ex-rdl', 6, 85, 100],

    ['ex-ez-curl', 0, 22.5, 27.5],
    ['ex-ez-curl', 1, 22.5, 30],
    ['ex-ez-curl', 2, 25, 30],
    ['ex-ez-curl', 3, 25, 32.5],
    ['ex-ez-curl', 4, 27.5, 32.5],
    ['ex-ez-curl', 5, 22.5, 27.5],
    ['ex-ez-curl', 6, 27.5, 35],
    ['ex-ez-curl', 7, 30, 35],
  ];

  const entries: WeeklyEntry[] = rawLogs.map(([exerciseId, weekIdx, minWeightKg, maxWeightKg, notes]) => {
    const week = weeks[weekIdx];
    return {
      id: `${exerciseId}__${week.id}`,
      exerciseId,
      weekId: week.id,
      minWeightKg,
      maxWeightKg,
      notes,
      updatedAt: `${week.startDate}T18:30:00Z`,
    };
  });

  return {
    exercises: STARTER_EXERCISES,
    weeks,
    entries,
  };
}

export function createEmptyState(): TrackerState {
  // 8 blank weeks starting from the current week's Monday
  const currentMonday = getMondayOfIsoWeek(new Date());
  const weeks = buildWeeks(8, currentMonday);
  return {
    exercises: [],
    weeks,
    entries: [],
  };
}
