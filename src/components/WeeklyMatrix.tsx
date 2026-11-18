import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Exercise, ExerciseCategory, WeekColumn, WeeklyEntry } from '../types/tracker';
import { AlternativeIcon, ENTRY_ICON_MAP, NoteBubbleIcon } from '../utils/entryIcons';
import {
  formatDeltaKg,
  formatShortDate,
  formatWeightRangeKg,
  formatWeightRangeValues,
} from '../utils/weight';

interface WeeklyMatrixProps {
  exercises: Exercise[];
  weeks: WeekColumn[];
  entries: WeeklyEntry[];
  categoryFilter: ExerciseCategory | 'All';
  onChangeCategoryFilter: (category: ExerciseCategory | 'All') => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  selectedExerciseId: string;
  onSelectExercise: (exerciseId: string) => void;
  activeWeekId: string;
  onSelectActiveWeek: (weekId: string) => void;
  onClickCell: (exerciseId: string, weekId: string) => void;
  onAppendWeeks: () => void;
  onOpenAddExercise: () => void;
  expandedExerciseIds: string[];
  onToggleExpandExercise: (exerciseId: string) => void;
  onOpenAddAlternative: (parentExercise: Exercise) => void;
  onDeleteAlternative: (alternativeId: string) => void;
  onPromoteAlternative: (alternativeId: string) => void;
}

const CATEGORY_FILTERS: Array<ExerciseCategory | 'All'> = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
];

export function WeeklyMatrix({
  exercises,
  weeks,
  entries,
  categoryFilter,
  onChangeCategoryFilter,
  searchQuery,
  onChangeSearchQuery,
  selectedExerciseId,
  onSelectExercise,
  activeWeekId,
  onSelectActiveWeek,
  onClickCell,
  onAppendWeeks,
  onOpenAddExercise,
  expandedExerciseIds,
  onToggleExpandExercise,
  onOpenAddAlternative,
  onDeleteAlternative,
  onPromoteAlternative,
}: WeeklyMatrixProps) {
  const lastAppendTimeRef = useRef<number>(0);
  const [openAltMenuId, setOpenAltMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openAltMenuId) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-alt-menu-root]')) {
        setOpenAltMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenAltMenuId(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openAltMenuId]);

  const handleHorizontalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth + 8) return;
    if (el.scrollLeft <= 12) return;

    const distanceToRight = el.scrollWidth - (el.scrollLeft + el.clientWidth);
    if (distanceToRight <= 64) {
      const now = Date.now();
      if (now - lastAppendTimeRef.current > 350) {
        lastAppendTimeRef.current = now;
        onAppendWeeks();
      }
    }
  };

  const entryMap = new Map<string, WeeklyEntry>();
  const maxWeightByExercise = new Map<string, number>();

  for (const entry of entries) {
    entryMap.set(`${entry.exerciseId}__${entry.weekId}`, entry);
    const currentMax = maxWeightByExercise.get(entry.exerciseId) ?? 0;
    if (entry.maxWeightKg > currentMax) {
      maxWeightByExercise.set(entry.exerciseId, entry.maxWeightKg);
    }
  }

  const alternativesByParent = new Map<string, Exercise[]>();
  const topLevelExercises: Exercise[] = [];

  for (const ex of exercises) {
    if (ex.parentExerciseId) {
      const list = alternativesByParent.get(ex.parentExerciseId) ?? [];
      list.push(ex);
      alternativesByParent.set(ex.parentExerciseId, list);
    } else {
      topLevelExercises.push(ex);
    }
  }

  const expandedSet = new Set(expandedExerciseIds);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesExerciseFilter = (ex: Exercise) => {
    const matchesCategory = categoryFilter === 'All' || ex.category === categoryFilter;
    const matchesSearch =
      !normalizedQuery ||
      ex.name.toLowerCase().includes(normalizedQuery) ||
      ex.muscle.toLowerCase().includes(normalizedQuery) ||
      ex.equipment.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesSearch;
  };

  const filteredExercises = topLevelExercises.filter((ex) => {
    if (matchesExerciseFilter(ex)) return true;
    const alts = alternativesByParent.get(ex.id) ?? [];
    return alts.some(matchesExerciseFilter);
  });

  const getMaxDeltaFromPriorWeek = (
    exerciseId: string,
    weekIndex: number,
    maxWeightKg: number
  ): number | null => {
    for (let i = weekIndex - 1; i >= 0; i--) {
      const prior = entryMap.get(`${exerciseId}__${weeks[i].id}`);
      if (prior) {
        return maxWeightKg - prior.maxWeightKg;
      }
    }
    return null;
  };

  const renderDesktopWeekCells = (ex: Exercise, compact = false) => {
    const peakMaxKg = maxWeightByExercise.get(ex.id) ?? 0;
    return weeks.map((wk, weekIdx) => {
      const entry = entryMap.get(`${ex.id}__${wk.id}`);
      const isActiveCol = wk.id === activeWeekId;

      if (!entry) {
        return (
          <td
            key={wk.id}
            className={`p-0 border-r border-slate-100 last:border-r-0 ${
              isActiveCol ? 'bg-orange-50/35' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onClickCell(ex.id, wk.id)}
              aria-label={`Log ${ex.name} for week of ${formatShortDate(wk.startDate)}`}
              className={`w-full ${
                compact ? 'min-h-[52px]' : 'min-h-[60px]'
              } px-3 py-2 flex items-center justify-end text-xs text-slate-300 hover:text-orange-600 hover:bg-orange-50/50 transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-orange-600`}
            >
              <span className="group-hover:hidden">—</span>
              <span className="hidden group-hover:inline font-medium">+ Log</span>
            </button>
          </td>
        );
      }

      const deltaMaxKg = getMaxDeltaFromPriorWeek(ex.id, weekIdx, entry.maxWeightKg);
      const isPR = peakMaxKg > 0 && entry.maxWeightKg >= peakMaxKg - 0.01;

      return (
        <td
          key={wk.id}
          className={`p-0 border-r border-slate-100 last:border-r-0 ${
            isActiveCol ? 'bg-orange-50/40' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => onClickCell(ex.id, wk.id)}
            title={entry.notes ? `Note: ${entry.notes}` : 'Click to edit'}
            className={`relative w-full ${
              compact ? 'min-h-[52px]' : 'min-h-[60px]'
            } px-3 py-2 flex items-center justify-end gap-2 text-right hover:bg-slate-100/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600`}
          >
            {entry.notes && entry.notes.trim().length > 0 && (
              <span
                className="absolute bottom-1.5 left-2 text-slate-400"
                title={entry.notes}
                aria-label={`Nota: ${entry.notes}`}
              >
                <NoteBubbleIcon className="w-2.5 h-2.5" />
              </span>
            )}

            <div className="min-w-0">
              <div className="flex items-baseline justify-end gap-1 whitespace-nowrap">
                {isPR && (
                  <span className="text-[10px] font-semibold tracking-tight text-orange-600">
                    PR
                  </span>
                )}
                <span className="font-mono tabular-nums text-[13px] font-semibold text-slate-900">
                  {formatWeightRangeValues(entry.minWeightKg, entry.maxWeightKg)}
                </span>
                <span className="text-[11px] text-slate-500">kg</span>
              </div>

              <div className="mt-0.5 text-[11px] font-mono tabular-nums">
                {deltaMaxKg === null ? (
                  <span className="text-slate-400">Base</span>
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
                      ? `${formatDeltaKg(deltaMaxKg)} max`
                      : 'Same max'}
                  </span>
                )}
              </div>
            </div>

            {entry.icons && entry.icons.length > 0 && (
              <div className="shrink-0 flex flex-col items-center justify-center gap-0.5">
                {entry.icons.map((iconId) => {
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
              </div>
            )}
          </button>
        </td>
      );
    });
  };

  return (
    <section id="grid" aria-labelledby="matrix-heading" className="space-y-4">
      <h1 id="matrix-heading" className="sr-only">
        Week-by-Week Weight Matrix
      </h1>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto max-w-full"
          role="tablist"
          aria-label="Filter by exercise category"
        >
          {CATEGORY_FILTERS.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeCategoryFilter(cat)}
                className={`px-3.5 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-64">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="Filter exercises..."
            aria-label="Filter exercises"
            className="w-full min-h-[40px] pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-orange-600"
          />
        </div>
      </div>

      {filteredExercises.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            {exercises.length === 0 ? 'No exercises tracked yet' : 'No exercises in this category'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {exercises.length === 0
              ? 'Add your core lifts to start tracking min–max weights week by week.'
              : categoryFilter !== 'All'
              ? `Add a ${categoryFilter} exercise or switch back to All.`
              : 'Try clearing your search term.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAddExercise}
              className="px-4 py-2 min-h-[40px] rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              New Exercise
            </button>
            {exercises.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChangeCategoryFilter('All');
                  onChangeSearchQuery('');
                }}
                className="px-4 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto" onScroll={handleHorizontalScroll}>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th
                      scope="col"
                      className="sticky left-0 z-20 bg-slate-50 min-w-[230px] w-[230px] px-4 py-2.5 text-xs font-semibold text-slate-600 border-r border-slate-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>Exercise</span>
                        <button
                          type="button"
                          onClick={onOpenAddExercise}
                          className="px-2 py-1 rounded-md border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          + New
                        </button>
                      </div>
                    </th>
                    {weeks.map((wk) => {
                      const isActive = wk.id === activeWeekId;
                      return (
                        <th
                          key={wk.id}
                          scope="col"
                          className={`min-w-[146px] px-3 py-2.5 text-right border-r border-slate-100 last:border-r-0 transition-colors ${
                            isActive ? 'bg-orange-50/70' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectActiveWeek(wk.id)}
                            title={`Set week of ${formatShortDate(wk.startDate)} as active week`}
                            className="w-full text-right group cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600 rounded"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {isActive && (
                                <span className="text-[11px] font-semibold text-orange-600">
                                  Active
                                </span>
                              )}
                              <span
                                className={`font-mono text-xs font-semibold ${
                                  isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                                }`}
                              >
                                {formatShortDate(wk.startDate)}
                              </span>
                            </div>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredExercises.map((ex) => {
                    const isSelectedRow = ex.id === selectedExerciseId;
                    const isExpanded = expandedSet.has(ex.id);
                    const alternatives = alternativesByParent.get(ex.id) ?? [];

                    return (
                      <React.Fragment key={ex.id}>
                        <tr
                          className={`transition-colors ${
                            isSelectedRow ? 'bg-orange-50/30' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <th
                            scope="row"
                            className={`sticky left-0 z-10 p-0 font-normal border-r border-slate-200 transition-colors ${
                              isSelectedRow ? 'bg-orange-50/95' : 'bg-white'
                            }`}
                          >
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => onSelectExercise(ex.id)}
                                className="w-full px-4 py-3 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600 rounded"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-sm font-semibold truncate ${
                                      isSelectedRow
                                        ? 'text-orange-700'
                                        : 'text-slate-900 group-hover:text-orange-600'
                                    }`}
                                  >
                                    {ex.name}
                                  </span>
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                      isSelectedRow
                                        ? 'text-orange-600 translate-x-0.5'
                                        : 'text-slate-300 group-hover:text-slate-500'
                                    }`}
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="mt-0.5 pr-6 text-xs text-slate-500 truncate">
                                  {ex.category} · {ex.muscle} · {ex.equipment}
                                </div>
                                {((ex.notes && ex.notes.length > 0) || alternatives.length > 0) && (
                                  <div className="mt-1 flex items-center gap-1.5 text-slate-400">
                                    {ex.notes && ex.notes.length > 0 && (
                                      <span
                                        title={ex.notes.join(' · ')}
                                        aria-label={`Notes: ${ex.notes.join(' · ')}`}
                                      >
                                        <NoteBubbleIcon className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                    {alternatives.length > 0 && (
                                      <span
                                        title={
                                          alternatives.length === 1
                                            ? `1 alternativa: ${alternatives[0].name}`
                                            : `${alternatives.length} alternativas`
                                        }
                                        aria-label={`${alternatives.length} alternativas`}
                                      >
                                        <AlternativeIcon className="w-3 h-3" />
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => onToggleExpandExercise(ex.id)}
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? `Ocultar alternativas de ${ex.name}`
                                    : `Ver alternativas de ${ex.name}`
                                }
                                title={isExpanded ? 'Ocultar alternativas' : 'Alternativas'}
                                className="absolute bottom-1.5 right-3 p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600"
                              >
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isExpanded ? 'rotate-180 text-orange-600' : ''
                                  }`}
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </th>

                          {renderDesktopWeekCells(ex)}
                        </tr>

                        {isExpanded && (
                          <>
                            {alternatives.map((alt) => {
                              const isAltSelected = alt.id === selectedExerciseId;
                              const isMenuOpen = openAltMenuId === alt.id;
                              return (
                                <tr
                                  key={alt.id}
                                  className={`transition-colors ${
                                    isAltSelected
                                      ? 'bg-orange-50/30'
                                      : 'bg-slate-50/40 hover:bg-slate-50/80'
                                  }`}
                                >
                                  <th
                                    scope="row"
                                    className={`sticky left-0 ${
                                      isMenuOpen ? 'z-30' : 'z-10'
                                    } p-0 font-normal border-r border-slate-200 border-l-2 border-l-slate-300 transition-colors ${
                                      isAltSelected ? 'bg-orange-50/95' : 'bg-slate-50'
                                    }`}
                                  >
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => onSelectExercise(alt.id)}
                                        className="w-full pl-7 pr-9 py-2.5 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600 rounded"
                                      >
                                        <div
                                          className={`text-xs font-semibold truncate ${
                                            isAltSelected
                                              ? 'text-orange-700'
                                              : 'text-slate-800 group-hover:text-orange-600'
                                          }`}
                                        >
                                          {alt.name}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                                          {alt.category} · {alt.muscle} · {alt.equipment}
                                        </div>
                                        {alt.notes && alt.notes.length > 0 && (
                                          <div
                                            className="mt-1 flex items-center text-slate-400"
                                            title={alt.notes.join(' · ')}
                                            aria-label={`Notes: ${alt.notes.join(' · ')}`}
                                          >
                                            <NoteBubbleIcon className="w-2.5 h-2.5" />
                                          </div>
                                        )}
                                      </button>

                                      <div
                                        data-alt-menu-root
                                        className="absolute right-2 top-1/2 -translate-y-1/2"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setOpenAltMenuId((prev) =>
                                              prev === alt.id ? null : alt.id
                                            )
                                          }
                                          aria-haspopup="menu"
                                          aria-expanded={isMenuOpen}
                                          aria-label={`Opciones para ${alt.name}`}
                                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>

                                        {isMenuOpen && (
                                          <div
                                            role="menu"
                                            aria-label={`Acciones para ${alt.name}`}
                                            className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-40"
                                          >
                                            <button
                                              type="button"
                                              role="menuitem"
                                              onClick={() => {
                                                setOpenAltMenuId(null);
                                                onPromoteAlternative(alt.id);
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <ArrowUpDown
                                                className="w-3.5 h-3.5 text-slate-500 shrink-0"
                                                aria-hidden="true"
                                              />
                                              <span>Transformar en principal</span>
                                            </button>
                                            <button
                                              type="button"
                                              role="menuitem"
                                              onClick={() => {
                                                setOpenAltMenuId(null);
                                                onDeleteAlternative(alt.id);
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                              <span>Eliminar</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </th>

                                  {renderDesktopWeekCells(alt, true)}
                                </tr>
                              );
                            })}

                            <tr className="bg-slate-50/30">
                              <th
                                scope="row"
                                className="sticky left-0 z-10 pl-7 pr-4 py-2 font-normal border-r border-slate-200 border-l-2 border-l-orange-300 bg-slate-50"
                              >
                                <button
                                  type="button"
                                  onClick={() => onOpenAddAlternative(ex)}
                                  className="w-full py-1.5 text-left flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600 rounded"
                                >
                                  <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  <span>Nueva alternativa</span>
                                </button>
                              </th>

                              {weeks.map((wk) => {
                                const isActiveCol = wk.id === activeWeekId;
                                return (
                                  <td
                                    key={wk.id}
                                    className={`p-0 border-r border-slate-100 last:border-r-0 ${
                                      isActiveCol ? 'bg-orange-50/25' : ''
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => onOpenAddAlternative(ex)}
                                      aria-label={`Nueva alternativa para ${ex.name}`}
                                      className="w-full min-h-[46px] px-3 py-2 flex items-center justify-end text-xs text-slate-300 hover:text-orange-600 hover:bg-orange-50/30 transition-colors cursor-pointer"
                                    >
                                      —
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1"
              onScroll={handleHorizontalScroll}
              role="tablist"
              aria-label="Select training week"
            >
              {weeks.map((wk) => {
                const active = wk.id === activeWeekId;
                return (
                  <button
                    key={wk.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSelectActiveWeek(wk.id)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold">
                      {formatShortDate(wk.startDate)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Exercise</span>
                <button
                  type="button"
                  onClick={onOpenAddExercise}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  + New
                </button>
              </div>
              {filteredExercises.map((ex) => {
                const activeWeekIdx = weeks.findIndex((w) => w.id === activeWeekId);
                const entry = entryMap.get(`${ex.id}__${activeWeekId}`);
                const peakMaxKg = maxWeightByExercise.get(ex.id) ?? 0;
                const isPR = entry && peakMaxKg > 0 && entry.maxWeightKg >= peakMaxKg - 0.01;
                const deltaMaxKg =
                  entry && activeWeekIdx >= 0
                    ? getMaxDeltaFromPriorWeek(ex.id, activeWeekIdx, entry.maxWeightKg)
                    : null;
                const isExpanded = expandedSet.has(ex.id);
                const alternatives = alternativesByParent.get(ex.id) ?? [];

                return (
                  <React.Fragment key={ex.id}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[68px]">
                      <div className="relative flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectExercise(ex.id)}
                          className="w-full pr-7 text-left cursor-pointer"
                        >
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {ex.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            {ex.category} · {ex.muscle} · {ex.equipment}
                          </div>
                          {((ex.notes && ex.notes.length > 0) || alternatives.length > 0) && (
                            <div className="mt-1 flex items-center gap-1.5 text-slate-400">
                              {ex.notes && ex.notes.length > 0 && (
                                <span
                                  title={ex.notes.join(' · ')}
                                  aria-label={`Notes: ${ex.notes.join(' · ')}`}
                                >
                                  <NoteBubbleIcon className="w-2.5 h-2.5" />
                                </span>
                              )}
                              {alternatives.length > 0 && (
                                <span
                                  title={
                                    alternatives.length === 1
                                      ? `1 alternativa: ${alternatives[0].name}`
                                      : `${alternatives.length} alternativas`
                                  }
                                  aria-label={`${alternatives.length} alternativas`}
                                >
                                  <AlternativeIcon className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleExpandExercise(ex.id)}
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Ocultar alternativas de ${ex.name}`
                              : `Ver alternativas de ${ex.name}`
                          }
                          className="absolute bottom-0 right-0 p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              isExpanded ? 'rotate-180 text-orange-600' : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onClickCell(ex.id, activeWeekId)}
                        className="relative min-h-[44px] pl-6 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-end gap-2 text-right shrink-0 cursor-pointer"
                      >
                        {entry && entry.notes && entry.notes.trim().length > 0 && (
                          <span
                            className="absolute bottom-1.5 left-1.5 text-slate-400"
                            title={entry.notes}
                            aria-label={`Nota: ${entry.notes}`}
                          >
                            <NoteBubbleIcon className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {entry ? (
                          <>
                            <div>
                              <div className="flex items-baseline justify-end gap-1">
                                {isPR && (
                                  <span className="text-[10px] font-semibold text-orange-600">PR</span>
                                )}
                                <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                                  {formatWeightRangeKg(entry.minWeightKg, entry.maxWeightKg)}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-slate-500">
                                {deltaMaxKg === null ? (
                                  <span>Base</span>
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
                                      ? `${formatDeltaKg(deltaMaxKg)} max`
                                      : 'Same max'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {entry.icons && entry.icons.length > 0 && (
                              <div className="shrink-0 flex items-center gap-0.5">
                                {entry.icons.map((iconId) => {
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
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-medium text-orange-600">+ Log</span>
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <>
                        {alternatives.map((alt) => {
                          const altEntry = entryMap.get(`${alt.id}__${activeWeekId}`);
                          const altPeakMaxKg = maxWeightByExercise.get(alt.id) ?? 0;
                          const isAltPR =
                            altEntry &&
                            altPeakMaxKg > 0 &&
                            altEntry.maxWeightKg >= altPeakMaxKg - 0.01;
                          const altDeltaMaxKg =
                            altEntry && activeWeekIdx >= 0
                              ? getMaxDeltaFromPriorWeek(
                                  alt.id,
                                  activeWeekIdx,
                                  altEntry.maxWeightKg
                                )
                              : null;

                          const isMobileMenuOpen = openAltMenuId === alt.id;

                          return (
                            <div
                              key={alt.id}
                              className="flex items-center justify-between gap-2 pl-7 pr-4 py-3 bg-slate-50/70 border-l-2 border-l-slate-300"
                            >
                              <button
                                type="button"
                                onClick={() => onSelectExercise(alt.id)}
                                className="flex-1 min-w-0 text-left cursor-pointer"
                              >
                                <div className="text-xs font-semibold text-slate-800 truncate">
                                  {alt.name}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  {alt.category} · {alt.muscle} · {alt.equipment}
                                </div>
                                {alt.notes && alt.notes.length > 0 && (
                                  <div
                                    className="mt-1 flex items-center text-slate-400"
                                    title={alt.notes.join(' · ')}
                                    aria-label={`Notes: ${alt.notes.join(' · ')}`}
                                  >
                                    <NoteBubbleIcon className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </button>

                              <div data-alt-menu-root className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenAltMenuId((prev) => (prev === alt.id ? null : alt.id))
                                  }
                                  aria-haspopup="menu"
                                  aria-expanded={isMobileMenuOpen}
                                  aria-label={`Opciones para ${alt.name}`}
                                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" aria-hidden="true" />
                                </button>

                                {isMobileMenuOpen && (
                                  <div
                                    role="menu"
                                    aria-label={`Acciones para ${alt.name}`}
                                    className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-40"
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenAltMenuId(null);
                                        onPromoteAlternative(alt.id);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <ArrowUpDown
                                        className="w-3.5 h-3.5 text-slate-500 shrink-0"
                                        aria-hidden="true"
                                      />
                                      <span>Transformar en principal</span>
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenAltMenuId(null);
                                        onDeleteAlternative(alt.id);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                      <span>Eliminar</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => onClickCell(alt.id, activeWeekId)}
                                className="relative min-h-[40px] pl-6 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-end gap-2 text-right shrink-0 cursor-pointer"
                              >
                                {altEntry && altEntry.notes && altEntry.notes.trim().length > 0 && (
                                  <span
                                    className="absolute bottom-1.5 left-1.5 text-slate-400"
                                    title={altEntry.notes}
                                    aria-label={`Nota: ${altEntry.notes}`}
                                  >
                                    <NoteBubbleIcon className="w-2.5 h-2.5" />
                                  </span>
                                )}
                                {altEntry ? (
                                  <>
                                    <div>
                                      <div className="flex items-baseline justify-end gap-1">
                                        {isAltPR && (
                                          <span className="text-[10px] font-semibold text-orange-600">
                                            PR
                                          </span>
                                        )}
                                        <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                                          {formatWeightRangeKg(
                                            altEntry.minWeightKg,
                                            altEntry.maxWeightKg
                                          )}
                                        </span>
                                      </div>
                                      <div className="text-[10px] font-mono tabular-nums text-slate-500">
                                        {altDeltaMaxKg === null ? (
                                          <span>Base</span>
                                        ) : (
                                          <span
                                            className={`font-medium ${
                                              altDeltaMaxKg > 0.01
                                                ? 'text-emerald-700'
                                                : altDeltaMaxKg < -0.01
                                                ? 'text-amber-700'
                                                : 'text-slate-500'
                                            }`}
                                          >
                                            {altDeltaMaxKg > 0.01 || altDeltaMaxKg < -0.01
                                              ? `${formatDeltaKg(altDeltaMaxKg)} max`
                                              : 'Same max'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {altEntry.icons && altEntry.icons.length > 0 && (
                                      <div className="shrink-0 flex items-center gap-0.5">
                                        {altEntry.icons.map((iconId) => {
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
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs font-medium text-orange-600">+ Log</span>
                                )}
                              </button>
                            </div>
                          );
                        })}

                        <div className="flex items-center justify-between gap-3 pl-7 pr-4 py-2.5 bg-slate-50/50 border-l-2 border-l-orange-300">
                          <button
                            type="button"
                            onClick={() => onOpenAddAlternative(ex)}
                            className="flex-1 min-w-0 text-left flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 cursor-pointer py-1"
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Nueva alternativa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenAddAlternative(ex)}
                            aria-label={`Nueva alternativa para ${ex.name}`}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-dashed border-slate-200 bg-white/70 text-xs text-slate-300 hover:text-orange-600 cursor-pointer shrink-0"
                          >
                            —
                          </button>
                        </div>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
