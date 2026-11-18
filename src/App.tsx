import { useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { BarChart3, CalendarDays, Database, Lock, LogOut } from 'lucide-react';
import { BackupPanel } from './components/BackupPanel';
import { ExerciseDetailModal } from './components/ExerciseDetailModal';
import { LogWeightModal } from './components/LogWeightModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { ProgressionChart } from './components/ProgressionChart';
import { NavSection, TopBar } from './components/TopBar';
import { WeeklyMatrix } from './components/WeeklyMatrix';
import { createEmptyState, createStarterState } from './data/seedData';
import { AUTHORIZED_OWNER_EMAIL, auth, googleProvider } from './firebase';
import {
  createExerciseDoc,
  deleteAlternativeDocs,
  deleteEntryDoc,
  promoteAlternativeDocs,
  replaceTrackerStateDocs,
  saveWeeksBatch,
  subscribeToUserTracker,
  updateExerciseNotesDoc,
  upsertEntryDoc,
} from './services/firestoreTracker';
import { Exercise, ExerciseCategory, TrackerState, WeeklyEntry } from './types/tracker';
import { loadTrackerState, saveTrackerState } from './utils/storage';
import { addDaysIso, getIsoWeekId, getMondayOfIsoWeek } from './utils/weight';

function getDefaultActiveWeekId(next: TrackerState): string {
  const loggedWeekIds = new Set(next.entries.map((e) => e.weekId));
  const latestLogged = [...next.weeks].reverse().find((w) => loggedWeekIds.has(w.id));
  return latestLogged?.id ?? next.weeks[0]?.id ?? '';
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [state, setState] = useState<TrackerState>(() => loadTrackerState());
  const [cloudReady, setCloudReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('grid');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    () => state.exercises[0]?.id ?? ''
  );
  const [activeWeekId, setActiveWeekId] = useState<string>(() => getDefaultActiveWeekId(state));

  const [logModal, setLogModal] = useState<{
    isOpen: boolean;
    exerciseId?: string;
    weekId?: string;
    createExercise?: boolean;
    parentExerciseId?: string;
  }>({ isOpen: false });
  const [detailExerciseId, setDetailExerciseId] = useState<string | null>(null);
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<string[]>([]);

  const seededWeeksRef = useRef<Set<string>>(new Set());
  const initialHydratedRef = useRef(false);

  const isAuthorized = Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === AUTHORIZED_OWNER_EMAIL.toLowerCase()
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setAuthError(null);
      if (!nextUser) {
        setCloudReady(false);
        initialHydratedRef.current = false;
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthorized || !user) {
      setCloudReady(false);
      return;
    }

    const uid = user.uid;
    const unsubscribe = subscribeToUserTracker(uid, (nextState, meta) => {
      let resolvedState = nextState;

      if (
        meta.hasWeeksLoaded &&
        nextState.weeks.length === 0 &&
        !seededWeeksRef.current.has(uid)
      ) {
        seededWeeksRef.current.add(uid);
        const initialWeeks = createEmptyState().weeks;
        resolvedState = {
          ...nextState,
          weeks: initialWeeks,
        };
        void saveWeeksBatch(uid, initialWeeks).catch(() => {
          setSyncError('No se pudieron inicializar las semanas en la nube.');
        });
      }

      setState(resolvedState);
      saveTrackerState(resolvedState);
      setCloudReady(true);
      setSyncError(null);

      if (!initialHydratedRef.current) {
        initialHydratedRef.current = true;
        setSelectedExerciseId(resolvedState.exercises[0]?.id ?? '');
        setActiveWeekId(getDefaultActiveWeekId(resolvedState));
      }
    });

    return unsubscribe;
  }, [isAuthorized, user]);

  useEffect(() => {
    if (
      state.exercises.length > 0 &&
      !state.exercises.some((ex) => ex.id === selectedExerciseId)
    ) {
      setSelectedExerciseId(state.exercises[0].id);
    }
  }, [state.exercises, selectedExerciseId]);

  useEffect(() => {
    if (
      state.weeks.length > 0 &&
      !state.weeks.some((wk) => wk.id === activeWeekId)
    ) {
      setActiveWeekId(state.weeks[0].id);
    }
  }, [state.weeks, activeWeekId]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Inicio de sesión cancelado.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e intenta de nuevo.');
      } else {
        setAuthError('No se pudo iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      setAuthError('No se pudo cerrar la sesión.');
    }
  };

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAppendWeeks = (count = 2) => {
    if (!user || !isAuthorized) return;
    const nextWeeks = [...state.weeks];
    const addedWeeks = [];
    for (let i = 0; i < count; i++) {
      const lastWeek = nextWeeks[nextWeeks.length - 1];
      const nextMonday = lastWeek
        ? addDaysIso(lastWeek.startDate, 7)
        : getMondayOfIsoWeek(new Date());
      const nextWeek = {
        id: getIsoWeekId(nextMonday),
        startDate: nextMonday,
      };
      if (!nextWeeks.some((w) => w.id === nextWeek.id)) {
        nextWeeks.push(nextWeek);
        addedWeeks.push(nextWeek);
      }
    }
    if (addedWeeks.length === 0) return;

    setState((prev) => ({
      ...prev,
      weeks: nextWeeks,
    }));
    void saveWeeksBatch(user.uid, addedWeeks).catch(() => {
      setSyncError('No se pudieron guardar las nuevas semanas en la nube.');
    });
  };

  const handleSaveEntry = (entryData: Omit<WeeklyEntry, 'id' | 'updatedAt'>) => {
    if (!user || !isAuthorized) return;
    const id = `${entryData.exerciseId}__${entryData.weekId}`;
    const nowIso = new Date().toISOString();
    const exists = state.entries.some(
      (e) => e.exerciseId === entryData.exerciseId && e.weekId === entryData.weekId
    );

    setState((prev) => {
      const nextEntries = exists
        ? prev.entries.map((e) =>
            e.exerciseId === entryData.exerciseId && e.weekId === entryData.weekId
              ? { ...e, ...entryData, updatedAt: nowIso }
              : e
          )
        : [...prev.entries, { id, ...entryData, updatedAt: nowIso }];
      return { ...prev, entries: nextEntries };
    });
    setSelectedExerciseId(entryData.exerciseId);
    setActiveWeekId(entryData.weekId);

    void upsertEntryDoc(user.uid, entryData, exists).catch(() => {
      setSyncError('Error al guardar el peso en la nube.');
    });
  };

  const handleDeleteEntry = (exerciseId: string, weekId: string) => {
    if (!user || !isAuthorized) return;
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter(
        (e) => !(e.exerciseId === exerciseId && e.weekId === weekId)
      ),
    }));
    void deleteEntryDoc(user.uid, exerciseId, weekId).catch(() => {
      setSyncError('Error al eliminar el registro en la nube.');
    });
  };

  const createExerciseRecord = (
    input: Omit<Exercise, 'id' | 'createdAt'>
  ): Exercise => {
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 24);
    return {
      ...input,
      id: `ex-${slug || 'lift'}-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
  };

  const handleAddExercise = (input: Omit<Exercise, 'id' | 'createdAt'>) => {
    const created = createExerciseRecord(input);
    const nextOrderIndex = state.exercises.length;
    setState((prev) => ({
      ...prev,
      exercises: [...prev.exercises, created],
    }));
    if (created.parentExerciseId) {
      setExpandedExerciseIds((prev) =>
        prev.includes(created.parentExerciseId!)
          ? prev
          : [...prev, created.parentExerciseId!]
      );
    } else {
      setSelectedExerciseId(created.id);
    }

    if (user && isAuthorized) {
      void createExerciseDoc(user.uid, created, nextOrderIndex).catch(() => {
        setSyncError('Error al crear el ejercicio en la nube.');
      });
    }
    return created;
  };

  const handleToggleExpandExercise = (exerciseId: string) => {
    setExpandedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleDeleteAlternative = (alternativeId: string) => {
    if (!user || !isAuthorized) return;
    const target = state.exercises.find((ex) => ex.id === alternativeId);
    if (!target) return;

    const entryIdsToDelete = state.entries
      .filter((entry) => entry.exerciseId === alternativeId)
      .map((entry) => entry.id);

    setState((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== alternativeId),
      entries: prev.entries.filter((entry) => entry.exerciseId !== alternativeId),
    }));
    if (selectedExerciseId === alternativeId) {
      setSelectedExerciseId(target.parentExerciseId ?? state.exercises[0]?.id ?? '');
    }
    if (detailExerciseId === alternativeId) {
      setDetailExerciseId(null);
    }

    void deleteAlternativeDocs(user.uid, alternativeId, entryIdsToDelete).catch(() => {
      setSyncError('Error al eliminar la alternativa en la nube.');
    });
  };

  const handlePromoteAlternative = (alternativeId: string) => {
    if (!user || !isAuthorized) return;
    const altIndex = state.exercises.findIndex((ex) => ex.id === alternativeId);
    const alt = altIndex >= 0 ? state.exercises[altIndex] : undefined;
    if (!alt || !alt.parentExerciseId) return;

    const oldParentId = alt.parentExerciseId;
    const oldParentIndex = state.exercises.findIndex((ex) => ex.id === oldParentId);
    const oldParent = oldParentIndex >= 0 ? state.exercises[oldParentIndex] : undefined;
    if (!oldParent) return;

    const siblingIds = state.exercises
      .filter((ex) => ex.parentExerciseId === oldParentId && ex.id !== alternativeId)
      .map((ex) => ex.id);

    setState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id === oldParentId) {
          return { ...alt, parentExerciseId: undefined };
        }
        if (ex.id === alternativeId) {
          return { ...oldParent, parentExerciseId: alternativeId };
        }
        if (ex.parentExerciseId === oldParentId) {
          return { ...ex, parentExerciseId: alternativeId };
        }
        return ex;
      }),
    }));

    setExpandedExerciseIds((prev) =>
      prev.map((id) => (id === oldParentId ? alternativeId : id))
    );
    if (selectedExerciseId === oldParentId) {
      setSelectedExerciseId(alternativeId);
    }

    void promoteAlternativeDocs(
      user.uid,
      oldParentId,
      oldParentIndex,
      alternativeId,
      altIndex,
      siblingIds
    ).catch(() => {
      setSyncError('Error al cambiar el ejercicio principal en la nube.');
    });
  };

  const handleAddExerciseNote = (exerciseId: string, note: string) => {
    if (!user || !isAuthorized) return;
    const trimmed = note.trim();
    if (!trimmed) return;
    const target = state.exercises.find((ex) => ex.id === exerciseId);
    if (!target) return;
    const nextNotes = [...(target.notes ?? []), trimmed];

    setState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, notes: nextNotes } : ex
      ),
    }));

    void updateExerciseNotesDoc(user.uid, exerciseId, nextNotes).catch(() => {
      setSyncError('Error al guardar la nota del ejercicio.');
    });
  };

  const handleDeleteExerciseNote = (exerciseId: string, noteIndex: number) => {
    if (!user || !isAuthorized) return;
    const target = state.exercises.find((ex) => ex.id === exerciseId);
    if (!target) return;
    const filtered = (target.notes ?? []).filter((_, idx) => idx !== noteIndex);
    const nextNotes = filtered.length > 0 ? filtered : undefined;

    setState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, notes: nextNotes } : ex
      ),
    }));

    void updateExerciseNotesDoc(user.uid, exerciseId, nextNotes).catch(() => {
      setSyncError('Error al eliminar la nota del ejercicio.');
    });
  };

  const handleReplaceState = (next: TrackerState) => {
    if (!user || !isAuthorized) return;
    const previous = state;
    setState(next);
    setSelectedExerciseId(next.exercises[0]?.id ?? '');
    setActiveWeekId(getDefaultActiveWeekId(next));

    void replaceTrackerStateDocs(user.uid, previous, next).catch(() => {
      setSyncError('Error al actualizar los datos en la nube.');
    });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-slate-300 border-t-orange-600 animate-spin" />
          <p className="text-xs font-medium text-slate-500">Cargando LoadLog...</p>
        </div>
        <OfflineIndicator />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                LoadLog
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Registro privado de pesos semana a semana
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-orange-400" aria-hidden="true" />
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Inicia sesión con tu cuenta de Google para acceder a tu tabla personal y mantener tus pesos sincronizados entre iPhone y Mac.
          </p>

          {authError && (
            <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {authError}
            </p>
          )}

          <button
            type="button"
            disabled={isSigningIn}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2.5"
          >
            {isSigningIn ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Conectando...</span>
              </>
            ) : (
              <span>Continuar con Google</span>
            )}
          </button>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Acceso exclusivo</span>
            <PWAInstallButton />
          </div>
        </div>
        <OfflineIndicator />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h1 className="font-display text-lg font-semibold text-slate-900">
            Acceso restringido
          </h1>
          <p className="text-sm text-slate-600">
            Esta aplicación es de uso personal. La cuenta{' '}
            <span className="font-medium text-slate-900">{user.email}</span> no está autorizada.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 min-h-[42px] rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
        <OfflineIndicator />
      </div>
    );
  }

  const detailExercise =
    detailExerciseId !== null
      ? state.exercises.find((ex) => ex.id === detailExerciseId) ?? null
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 md:pb-0">
      <TopBar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        userEmail={user.email}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
        {syncError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700"
          >
            <span>{syncError}</span>
            <button
              type="button"
              onClick={() => setSyncError(null)}
              className="text-red-600 hover:text-red-800 underline cursor-pointer shrink-0"
            >
              Cerrar
            </button>
          </div>
        )}

        {!cloudReady ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-orange-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">Sincronizando tus entrenamientos...</p>
          </div>
        ) : (
          <>
            <WeeklyMatrix
              exercises={state.exercises}
              weeks={state.weeks}
              entries={state.entries}
              categoryFilter={categoryFilter}
              onChangeCategoryFilter={setCategoryFilter}
              searchQuery={searchQuery}
              onChangeSearchQuery={setSearchQuery}
              selectedExerciseId={selectedExerciseId}
              onSelectExercise={(id) => {
                setSelectedExerciseId(id);
                setDetailExerciseId(id);
              }}
              activeWeekId={activeWeekId}
              onSelectActiveWeek={setActiveWeekId}
              onClickCell={(exerciseId, weekId) =>
                setLogModal({ isOpen: true, exerciseId, weekId })
              }
              onAppendWeeks={() => handleAppendWeeks(2)}
              onOpenAddExercise={() =>
                setLogModal({
                  isOpen: true,
                  weekId: activeWeekId || state.weeks[0]?.id,
                  createExercise: true,
                })
              }
              expandedExerciseIds={expandedExerciseIds}
              onToggleExpandExercise={handleToggleExpandExercise}
              onOpenAddAlternative={(parentEx) =>
                setLogModal({
                  isOpen: true,
                  weekId: activeWeekId || state.weeks[0]?.id,
                  createExercise: true,
                  parentExerciseId: parentEx.id,
                })
              }
              onDeleteAlternative={handleDeleteAlternative}
              onPromoteAlternative={handlePromoteAlternative}
            />

            <ProgressionChart
              exercises={state.exercises}
              weeks={state.weeks}
              entries={state.entries}
              selectedExerciseId={selectedExerciseId}
              onSelectExercise={setSelectedExerciseId}
              onEditCell={(exerciseId, weekId) =>
                setLogModal({ isOpen: true, exerciseId, weekId })
              }
            />

            <BackupPanel
              state={state}
              onImportState={handleReplaceState}
              onResetStarter={() => handleReplaceState(createStarterState())}
              onClearAll={() => handleReplaceState(createEmptyState())}
            />
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>LoadLog · Week-by-week progressive overload tracker</span>
          <span>Synced privately with your account · Export CSV or JSON anytime</span>
        </div>
      </footer>

      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-t border-slate-200 grid grid-cols-3"
      >
        {(
          [
            { id: 'grid', label: 'Grid', Icon: CalendarDays },
            { id: 'progress', label: 'Progress', Icon: BarChart3 },
            { id: 'backup', label: 'Backup', Icon: Database },
          ] as const
        ).map(({ id, label, Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleNavigate(id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                active ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <OfflineIndicator />

      <LogWeightModal
        isOpen={logModal.isOpen}
        onClose={() => setLogModal({ isOpen: false })}
        exercises={state.exercises}
        weeks={state.weeks}
        entries={state.entries}
        initialExerciseId={logModal.exerciseId}
        initialWeekId={logModal.weekId}
        initialCreateExercise={logModal.createExercise}
        initialParentExercise={
          logModal.parentExerciseId
            ? state.exercises.find((ex) => ex.id === logModal.parentExerciseId) ?? null
            : null
        }
        onSaveEntry={handleSaveEntry}
        onDeleteEntry={handleDeleteEntry}
        onQuickCreateExercise={handleAddExercise}
      />

      <ExerciseDetailModal
        isOpen={detailExercise !== null}
        onClose={() => setDetailExerciseId(null)}
        exercise={detailExercise}
        weeks={state.weeks}
        entries={state.entries}
        onAddNote={handleAddExerciseNote}
        onDeleteNote={handleDeleteExerciseNote}
        onEditWeekCell={(exerciseId, weekId) => {
          setDetailExerciseId(null);
          setLogModal({ isOpen: true, exerciseId, weekId });
        }}
        onDeleteAlternative={handleDeleteAlternative}
      />
    </div>
  );
}
