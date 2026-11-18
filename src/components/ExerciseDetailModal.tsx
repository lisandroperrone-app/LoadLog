import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Exercise, WeekColumn, WeeklyEntry } from '../types/tracker';
import { NoteBubbleIcon } from '../utils/entryIcons';
import { ExerciseProgressionGraph } from './ExerciseProgressionGraph';

interface ExerciseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  weeks: WeekColumn[];
  entries: WeeklyEntry[];
  onAddNote: (exerciseId: string, note: string) => void;
  onDeleteNote: (exerciseId: string, noteIndex: number) => void;
  onEditWeekCell: (exerciseId: string, weekId: string) => void;
  onDeleteAlternative?: (alternativeId: string) => void;
}

export function ExerciseDetailModal({
  isOpen,
  onClose,
  exercise,
  weeks,
  entries,
  onAddNote,
  onDeleteNote,
  onEditWeekCell,
  onDeleteAlternative,
}: ExerciseDetailModalProps) {
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setNoteInput('');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, exercise?.id, onClose]);

  if (!isOpen || !exercise) return null;

  const notes = exercise.notes ?? [];

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    onAddNote(exercise.id, trimmed);
    setNoteInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-detail-title"
    >
      <div className="w-full sm:max-w-3xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 shrink-0" />

        <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2
              id="exercise-detail-title"
              className="font-display text-lg sm:text-xl font-semibold text-slate-900 truncate"
            >
              {exercise.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
              {exercise.category} · {exercise.muscle} · {exercise.equipment}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {exercise.parentExerciseId && onDeleteAlternative && (
              <button
                type="button"
                onClick={() => {
                  onDeleteAlternative(exercise.id);
                  onClose();
                }}
                aria-label={`Eliminar alternativa ${exercise.name}`}
                title="Eliminar alternativa"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-6 overflow-y-auto">
          <section aria-labelledby="exercise-notes-heading" className="space-y-3">
            <h3
              id="exercise-notes-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Notes
            </h3>

            <form onSubmit={handleSubmitNote} className="flex items-center gap-2">
              <input
                type="text"
                maxLength={180}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Write a note and press Enter..."
                aria-label="Add exercise note"
                className="flex-1 min-w-0 min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-orange-600"
              />
              <button
                type="submit"
                disabled={!noteInput.trim()}
                className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add</span>
              </button>
            </form>

            {notes.length === 0 ? (
              <p className="text-xs text-slate-400">No notes added for this exercise yet.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((note, idx) => (
                  <li
                    key={`${idx}-${note}`}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <NoteBubbleIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-800 break-words">{note}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(exercise.id, idx)}
                      aria-label={`Delete note: ${note}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="exercise-chart-heading" className="space-y-3">
            <h3
              id="exercise-chart-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Progression
            </h3>
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <ExerciseProgressionGraph
                exercise={exercise}
                weeks={weeks}
                entries={entries}
                compact
                statsMode="modal"
                onClickWeek={(weekId) => onEditWeekCell(exercise.id, weekId)}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
