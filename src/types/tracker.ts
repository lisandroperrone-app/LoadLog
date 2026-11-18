export type ExerciseCategory =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Legs'
  | 'Arms'
  | 'Core';

export type EquipmentType = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight';

export type EntryIconId = 'failure' | 'step_regression' | 'next_up' | 'next_down';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscle: string;
  equipment: EquipmentType;
  stepIncrementKg: number;
  notes?: string[];
  parentExerciseId?: string;
  createdAt: string;
}

export interface WeekColumn {
  id: string; // e.g. '2026-W47'
  startDate: string; // ISO YYYY-MM-DD (Monday)
}

export interface WeeklyEntry {
  id: string;
  exerciseId: string;
  weekId: string;
  minWeightKg: number;
  maxWeightKg: number;
  icons?: EntryIconId[];
  notes?: string;
  updatedAt: string;
}

export interface TrackerState {
  exercises: Exercise[];
  weeks: WeekColumn[];
  entries: WeeklyEntry[];
}
