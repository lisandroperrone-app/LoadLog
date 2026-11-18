import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Trash2, X } from 'lucide-react';
import {
  EntryIconId,
  EquipmentType,
  Exercise,
  ExerciseCategory,
  WeekColumn,
  WeeklyEntry,
} from '../types/tracker';
import { ENTRY_ICON_MAP, ENTRY_ICON_OPTIONS, NoteBubbleIcon } from '../utils/entryIcons';
import { formatShortDate, formatWeightValue } from '../utils/weight';

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  weeks: WeekColumn[];
  entries: WeeklyEntry[];
  initialExerciseId?: string;
  initialWeekId?: string;
  initialCreateExercise?: boolean;
  initialParentExercise?: Exercise | null;
  onSaveEntry: (entry: Omit<WeeklyEntry, 'id' | 'updatedAt'>) => void;
  onDeleteEntry: (exerciseId: string, weekId: string) => void;
  onQuickCreateExercise: (exercise: Omit<Exercise, 'id' | 'createdAt'>) => Exercise;
}

const CATEGORIES: ExerciseCategory[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
];
const EQUIPMENTS: EquipmentType[] = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'];

export function LogWeightModal({
  isOpen,
  onClose,
  exercises,
  weeks,
  entries,
  initialExerciseId,
  initialWeekId,
  initialCreateExercise,
  initialParentExercise,
  onSaveEntry,
  onDeleteEntry,
  onQuickCreateExercise,
}: LogWeightModalProps) {
  const [exerciseId, setExerciseId] = useState<string>('');
  const [weekId, setWeekId] = useState<string>('');
  const [minWeightInput, setMinWeightInput] = useState<string>('');
  const [maxWeightInput, setMaxWeightInput] = useState<string>('');
  const [selectedIcons, setSelectedIcons] = useState<EntryIconId[]>([]);
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const [savedNote, setSavedNote] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [creatingExercise, setCreatingExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState<ExerciseCategory>('Chest');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [newExEquipment, setNewExEquipment] = useState<EquipmentType>('Barbell');

  const iconDropdownRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!justOpened) return;

    const isCreateMode =
      Boolean(initialCreateExercise) || Boolean(initialParentExercise) || exercises.length === 0;
    setCreatingExercise(isCreateMode);
    setIconMenuOpen(false);
    setErrorMsg('');

    if (initialParentExercise) {
      setNewExName('');
      setNewExCategory(initialParentExercise.category);
      setNewExMuscle(initialParentExercise.muscle);
      setNewExEquipment(initialParentExercise.equipment);
    } else if (initialCreateExercise) {
      setNewExName('');
      setNewExCategory('Chest');
      setNewExMuscle('');
      setNewExEquipment('Barbell');
    }

    const targetExId =
      initialExerciseId && exercises.some((e) => e.id === initialExerciseId)
        ? initialExerciseId
        : exercises[0]?.id ?? '';
    const targetWkId =
      initialWeekId && weeks.some((w) => w.id === initialWeekId)
        ? initialWeekId
        : weeks[0]?.id ?? '';

    setExerciseId(targetExId);
    setWeekId(targetWkId);
  }, [
    isOpen,
    initialExerciseId,
    initialWeekId,
    initialCreateExercise,
    initialParentExercise,
    exercises,
    weeks,
  ]);

  useEffect(() => {
    if (!isOpen || !exerciseId || !weekId) return;

    const existing = entries.find(
      (e) => e.exerciseId === exerciseId && e.weekId === weekId
    );

    if (existing) {
      setMinWeightInput(formatWeightValue(existing.minWeightKg));
      setMaxWeightInput(formatWeightValue(existing.maxWeightKg));
      setSelectedIcons(existing.icons ?? []);
      setSavedNote(existing.notes ?? '');
      setNoteDraft('');
    } else {
      setMinWeightInput('');
      setMaxWeightInput('');
      setSelectedIcons([]);
      setSavedNote('');
      setNoteDraft('');
    }
  }, [isOpen, exerciseId, weekId, entries]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (iconMenuOpen) {
          setIconMenuOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, iconMenuOpen, onClose]);

  useEffect(() => {
    if (!iconMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (iconDropdownRef.current && !iconDropdownRef.current.contains(e.target as Node)) {
        setIconMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [iconMenuOpen]);

  if (!isOpen) return null;

  const existingEntry = entries.find(
    (e) => e.exerciseId === exerciseId && e.weekId === weekId
  );

  const toggleIcon = (id: EntryIconId) => {
    setSelectedIcons((prev) => {
      const exists = prev.includes(id);
      const nextSet = new Set(exists ? prev.filter((item) => item !== id) : [...prev, id]);
      return ENTRY_ICON_OPTIONS.map((opt) => opt.id).filter((optId) => nextSet.has(optId));
    });
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = noteDraft.trim();
      if (!trimmed) return;
      setSavedNote((prev) => (prev ? `${prev} · ${trimmed}` : trimmed));
      setNoteDraft('');
    }
  };

  const handleQuickCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) {
      setErrorMsg(
        initialParentExercise
          ? 'Ingresa un nombre para la alternativa.'
          : 'Enter an exercise name first.'
      );
      return;
    }
    const created = onQuickCreateExercise({
      name: newExName.trim(),
      category: newExCategory,
      muscle: newExMuscle.trim() || newExCategory,
      equipment: newExEquipment,
      stepIncrementKg: 2.5,
      parentExerciseId: initialParentExercise?.id,
    });
    setNewExName('');
    setNewExMuscle('');
    setErrorMsg('');

    if (initialParentExercise) {
      onClose();
      return;
    }

    setExerciseId(created.id);
    setCreatingExercise(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseId || !weekId) {
      setErrorMsg('Select an exercise and week.');
      return;
    }

    const parsedMin = parseFloat(minWeightInput);
    const parsedMax = parseFloat(maxWeightInput);

    if (Number.isNaN(parsedMin) || parsedMin < 0) {
      setErrorMsg('Enter a valid minimum weight in kg.');
      return;
    }
    if (Number.isNaN(parsedMax) || parsedMax < 0) {
      setErrorMsg('Enter a valid maximum weight in kg.');
      return;
    }
    if (parsedMin > parsedMax) {
      setErrorMsg('Minimum weight cannot be greater than maximum weight.');
      return;
    }

    const draftTrimmed = noteDraft.trim();
    const finalNote = [savedNote.trim(), draftTrimmed].filter(Boolean).join(' · ');

    onSaveEntry({
      exerciseId,
      weekId,
      minWeightKg: Math.round(parsedMin * 100) / 100,
      maxWeightKg: Math.round(parsedMax * 100) / 100,
      icons: selectedIcons.length > 0 ? selectedIcons : undefined,
      notes: finalNote || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-xl overflow-visible max-h-[92vh] flex flex-col">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3" />

        <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="log-modal-title" className="font-display text-lg font-semibold text-slate-900">
              {creatingExercise
                ? initialParentExercise
                  ? 'Nueva alternativa'
                  : 'New Exercise'
                : existingEntry
                ? 'Update Weekly Weights'
                : 'Log Weekly Weights'}
            </h2>
            {creatingExercise && initialParentExercise && (
              <p className="text-xs text-slate-500 mt-0.5">
                Alternativa para {initialParentExercise.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4">
          {creatingExercise ? (
            <form onSubmit={handleQuickCreateExercise} className="space-y-4">
              <div>
                <label htmlFor="quick-ex-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Exercise Name
                </label>
                <input
                  id="quick-ex-name"
                  type="text"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  placeholder="e.g. Bulgarian Split Squat"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quick-ex-category" className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    id="quick-ex-category"
                    value={newExCategory}
                    onChange={(e) => setNewExCategory(e.target.value as ExerciseCategory)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="quick-ex-equip" className="block text-xs font-medium text-slate-700 mb-1">
                    Equipment
                  </label>
                  <select
                    id="quick-ex-equip"
                    value={newExEquipment}
                    onChange={(e) => setNewExEquipment(e.target.value as EquipmentType)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
                  >
                    {EQUIPMENTS.map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="quick-ex-muscle" className="block text-xs font-medium text-slate-700 mb-1">
                  Target Muscle
                </label>
                <input
                  id="quick-ex-muscle"
                  type="text"
                  value={newExMuscle}
                  onChange={(e) => setNewExMuscle(e.target.value)}
                  placeholder="e.g. Quads & Glutes"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
                />
              </div>
              {errorMsg && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {initialParentExercise ? 'Guardar alternativa' : 'Create Exercise'}
              </button>
            </form>
          ) : (
            <form id="log-weight-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="modal-exercise" className="block text-xs font-medium text-slate-700 mb-1">
                    Exercise
                  </label>
                  <select
                    id="modal-exercise"
                    value={exerciseId}
                    onChange={(e) => setExerciseId(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
                  >
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-week" className="block text-xs font-medium text-slate-700 mb-1">
                    Week
                  </label>
                  <select
                    id="modal-week"
                    value={weekId}
                    onChange={(e) => setWeekId(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
                  >
                    {weeks.map((wk) => (
                      <option key={wk.id} value={wk.id}>
                        {formatShortDate(wk.startDate)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                <div className="sm:col-span-5">
                  <label htmlFor="modal-min-weight" className="block text-xs font-medium text-slate-700 mb-1">
                    Min Weight (kg)
                  </label>
                  <input
                    id="modal-min-weight"
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    value={minWeightInput}
                    onChange={(e) => {
                      setMinWeightInput(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="0"
                    className="w-full min-h-[46px] px-3.5 py-2.5 font-mono tabular-nums text-lg font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-orange-600"
                  />
                </div>

                <div className="sm:col-span-7">
                  <label htmlFor="modal-max-weight" className="block text-xs font-medium text-slate-700 mb-1">
                    Max Weight (kg)
                  </label>
                  <div className="flex items-stretch gap-2">
                    <input
                      id="modal-max-weight"
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={maxWeightInput}
                      onChange={(e) => {
                        setMaxWeightInput(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="0"
                      autoFocus
                      className="flex-1 min-w-0 min-h-[46px] px-3.5 py-2.5 font-mono tabular-nums text-lg font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-orange-600"
                    />

                    <div className="relative shrink-0" ref={iconDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIconMenuOpen((open) => !open)}
                        aria-haspopup="listbox"
                        aria-expanded={iconMenuOpen}
                        aria-label="Seleccionar íconos"
                        className={`min-h-[46px] px-2.5 rounded-xl border bg-white flex items-center gap-1.5 transition-colors cursor-pointer ${
                          iconMenuOpen
                            ? 'border-orange-600 ring-1 ring-orange-600/20'
                            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {selectedIcons.length > 0 ? (
                          <span className="flex items-center gap-1">
                            {selectedIcons.map((iconId) => {
                              const opt = ENTRY_ICON_MAP.get(iconId);
                              if (!opt) return null;
                              const IconComp = opt.Icon;
                              return (
                                <IconComp
                                  key={iconId}
                                  className={`w-4 h-4 ${opt.colorClass}`}
                                  aria-hidden="true"
                                />
                              );
                            })}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                            Íconos
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            iconMenuOpen ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      {iconMenuOpen && (
                        <div
                          role="listbox"
                          aria-multiselectable="true"
                          aria-label="Íconos de la celda"
                          className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40"
                        >
                          {ENTRY_ICON_OPTIONS.map((opt) => {
                            const selected = selectedIcons.includes(opt.id);
                            const IconComp = opt.Icon;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => toggleIcon(opt.id)}
                                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-orange-50/70 text-slate-900 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <IconComp
                                    className={`w-4 h-4 shrink-0 ${opt.colorClass}`}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{opt.label}</span>
                                </span>
                                <span
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                    selected
                                      ? 'bg-slate-900 border-slate-900 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {selected && <Check className="w-3 h-3" aria-hidden="true" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Committed note displayed below the weights next to speech-bubble icon */}
              {savedNote && (
                <div className="flex items-start justify-between gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-start gap-2 min-w-0">
                    <NoteBubbleIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-800 break-words">{savedNote}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedNote('')}
                    aria-label="Remove note"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="modal-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Note
                </label>
                <input
                  id="modal-notes"
                  type="text"
                  maxLength={140}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  placeholder="Write a note and press Enter..."
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
                />
              </div>

              {errorMsg && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {errorMsg}
                </p>
              )}
            </form>
          )}
        </div>

        {!creatingExercise && (
          <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between gap-3">
            {existingEntry ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(exerciseId, weekId);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Clear Log</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="log-weight-form"
                className="px-5 py-2 min-h-[40px] rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {existingEntry ? 'Update Weights' : 'Save Weights'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
