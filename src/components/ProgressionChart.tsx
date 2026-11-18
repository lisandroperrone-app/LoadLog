import { Pencil } from 'lucide-react';
import { Exercise, WeekColumn, WeeklyEntry } from '../types/tracker';
import { ENTRY_ICON_MAP } from '../utils/entryIcons';
import {
  formatDeltaKg,
  formatShortDate,
  formatWeightKg,
} from '../utils/weight';
import { ExerciseProgressionGraph } from './ExerciseProgressionGraph';

interface ProgressionChartProps {
  exercises: Exercise[];
  weeks: WeekColumn[];
  entries: WeeklyEntry[];
  selectedExerciseId: string;
  onSelectExercise: (id: string) => void;
  onEditCell: (exerciseId: string, weekId: string) => void;
}

export function ProgressionChart({
  exercises,
  weeks,
  entries,
  selectedExerciseId,
  onSelectExercise,
  onEditCell,
}: ProgressionChartProps) {
  const selectedExercise =
    exercises.find((e) => e.id === selectedExerciseId) ?? exercises[0];

  if (!selectedExercise) {
    return null;
  }

  const entryByWeek = new Map<string, WeeklyEntry>();
  for (const e of entries) {
    if (e.exerciseId === selectedExercise.id) {
      entryByWeek.set(e.weekId, e);
    }
  }

  const points = weeks
    .map((week) => {
      const entry = entryByWeek.get(week.id);
      if (!entry) return null;
      return { week, entry };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const allTimeBestMaxKg = points.reduce(
    (max, p) => Math.max(max, p.entry.maxWeightKg),
    0
  );

  return (
    <section id="progress" aria-labelledby="progress-heading" className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 id="progress-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Exercise Progression
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Track weekly minimum and maximum weight (kg) trajectory for a single exercise.
          </p>
        </div>

        <div>
          <label htmlFor="progress-exercise-select" className="sr-only">
            Select exercise
          </label>
          <select
            id="progress-exercise-select"
            value={selectedExercise.id}
            onChange={(e) => onSelectExercise(e.target.value)}
            className="min-h-[40px] px-3.5 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-orange-600"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="text-base font-semibold text-slate-900">
            {selectedExercise.name}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {selectedExercise.category} · {selectedExercise.muscle} · {selectedExercise.equipment}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <ExerciseProgressionGraph
            exercise={selectedExercise}
            weeks={weeks}
            entries={entries}
            onClickWeek={(weekId) => onEditCell(selectedExercise.id, weekId)}
          />
        </div>

        {points.length > 0 && (
          <div className="border-t border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-2.5">Week</th>
                  <th className="px-4 py-2.5 text-right">Min Weight</th>
                  <th className="px-4 py-2.5 text-right">Max Weight</th>
                  <th className="px-4 py-2.5 text-right">vs Prior Max</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[...points].reverse().map((pt, revIdx, arr) => {
                  const prevPt = arr[revIdx + 1];
                  const deltaMaxKg = prevPt
                    ? pt.entry.maxWeightKg - prevPt.entry.maxWeightKg
                    : null;
                  const isPR =
                    allTimeBestMaxKg > 0 &&
                    pt.entry.maxWeightKg >= allTimeBestMaxKg - 0.01;

                  return (
                    <tr key={pt.week.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono font-medium text-slate-900">
                          {formatShortDate(pt.week.startDate)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatWeightKg(pt.entry.minWeightKg)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span>
                            {isPR && (
                              <span className="text-[11px] font-semibold text-orange-600 mr-1.5">PR</span>
                            )}
                            {formatWeightKg(pt.entry.maxWeightKg)}
                          </span>
                          {pt.entry.icons && pt.entry.icons.length > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              {pt.entry.icons.map((iconId) => {
                                const opt = ENTRY_ICON_MAP.get(iconId);
                                if (!opt) return null;
                                const IconComp = opt.Icon;
                                return (
                                  <span key={iconId} title={opt.label} aria-label={opt.label}>
                                    <IconComp
                                      className={`w-3.5 h-3.5 ${opt.colorClass}`}
                                      aria-hidden="true"
                                    />
                                  </span>
                                );
                              })}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        {deltaMaxKg === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`font-medium ${
                              deltaMaxKg > 0.01
                                ? 'text-emerald-700'
                                : deltaMaxKg < -0.01
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {deltaMaxKg > 0.01 || deltaMaxKg < -0.01
                              ? `${formatDeltaKg(deltaMaxKg)} kg`
                              : 'Same'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[260px] truncate">
                        {pt.entry.notes ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditCell(selectedExercise.id, pt.week.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
