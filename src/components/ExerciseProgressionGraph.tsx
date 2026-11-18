import { useMemo, useState } from 'react';
import { Exercise, WeekColumn, WeeklyEntry } from '../types/tracker';
import {
  formatDeltaKg,
  formatNumber,
  formatShortDate,
  formatWeightKg,
  formatWeightRangeKg,
  roundToQuarterKg,
} from '../utils/weight';

interface ExerciseProgressionGraphProps {
  exercise: Exercise;
  weeks: WeekColumn[];
  entries: WeeklyEntry[];
  onClickWeek?: (weekId: string) => void;
  compact?: boolean;
  statsMode?: 'full' | 'modal';
}

export function ExerciseProgressionGraph({
  exercise,
  weeks,
  entries,
  onClickWeek,
  compact = false,
  statsMode = 'full',
}: ExerciseProgressionGraphProps) {
  const [hoveredWeekId, setHoveredWeekId] = useState<string | null>(null);

  const {
    entryByWeek,
    chartWeeks,
    points,
    allTimeBestMaxKg,
    peakPoint,
    totalMaxGainKg,
    latestPoint,
  } = useMemo(() => {
    const map = new Map<string, WeeklyEntry>();
    for (const e of entries) {
      if (e.exerciseId === exercise.id) {
        map.set(e.weekId, e);
      }
    }

    let lastLoggedWeekIdx = -1;
    weeks.forEach((wk, idx) => {
      if (map.has(wk.id)) {
        lastLoggedWeekIdx = idx;
      }
    });

    const slicedWeeks = weeks.slice(
      0,
      Math.max(lastLoggedWeekIdx + 1, Math.min(weeks.length, 8))
    );

    const pts = slicedWeeks
      .map((week, idx) => {
        const entry = map.get(week.id);
        if (!entry) return null;
        return {
          week,
          weekIdx: idx,
          entry,
          minVal: roundToQuarterKg(entry.minWeightKg),
          maxVal: roundToQuarterKg(entry.maxWeightKg),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    let bestMax = 0;
    let bestPt: (typeof pts)[number] | null = null;
    for (const p of pts) {
      if (p.entry.maxWeightKg >= bestMax) {
        bestMax = p.entry.maxWeightKg;
        bestPt = p;
      }
    }
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const gainKg =
      firstPt && lastPt ? lastPt.entry.maxWeightKg - firstPt.entry.maxWeightKg : 0;

    return {
      entryByWeek: map,
      chartWeeks: slicedWeeks,
      points: pts,
      allTimeBestMaxKg: bestMax,
      peakPoint: bestPt,
      totalMaxGainKg: gainKg,
      latestPoint: lastPt ?? null,
    };
  }, [exercise.id, weeks, entries]);

  const activePoint =
    (hoveredWeekId ? points.find((p) => p.week.id === hoveredWeekId) : null) ??
    latestPoint ??
    null;

  const width = Math.max(compact ? 640 : 820, chartWeeks.length * (compact ? 76 : 88));
  const height = compact ? 230 : 270;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allValues = points.flatMap((p) => [p.minVal, p.maxVal]);
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 100;
  const spread = Math.max(rawMax - rawMin, 10);
  const minY = Math.max(0, Math.floor((rawMin - spread * 0.2) / 5) * 5);
  const maxY = Math.ceil((rawMax + spread * 0.18) / 5) * 5;
  const yRange = Math.max(maxY - minY, 5);

  const xForWeekIdx = (weekIdx: number) => {
    if (chartWeeks.length <= 1) return padLeft + plotW / 2;
    return padLeft + (weekIdx / (chartWeeks.length - 1)) * plotW;
  };

  const yForValue = (v: number) => {
    return padTop + plotH - ((v - minY) / yRange) * plotH;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minY + yRange * t);

  const maxPolyline = points
    .map((p) => `${xForWeekIdx(p.weekIdx).toFixed(1)},${yForValue(p.maxVal).toFixed(1)}`)
    .join(' ');

  const minPolyline = points
    .map((p) => `${xForWeekIdx(p.weekIdx).toFixed(1)},${yForValue(p.minVal).toFixed(1)}`)
    .join(' ');

  const bandPath =
    points.length >= 2
      ? `M ${points
          .map((p) => `${xForWeekIdx(p.weekIdx).toFixed(1)} ${yForValue(p.maxVal).toFixed(1)}`)
          .join(' L ')} L ${[...points]
          .reverse()
          .map((p) => `${xForWeekIdx(p.weekIdx).toFixed(1)} ${yForValue(p.minVal).toFixed(1)}`)
          .join(' L ')} Z`
      : '';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        {statsMode === 'modal' ? (
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Peak Max</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {peakPoint ? (
                  <>
                    {formatWeightKg(peakPoint.entry.maxWeightKg)}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      · {formatShortDate(peakPoint.week.startDate)}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Last Max</span>
              <span className="font-mono tabular-nums font-semibold text-orange-600">
                {latestPoint ? formatWeightKg(latestPoint.entry.maxWeightKg) : '—'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Peak Max</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {allTimeBestMaxKg > 0 ? formatWeightKg(allTimeBestMaxKg) : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Max Change</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  totalMaxGainKg > 0.01
                    ? 'text-emerald-700'
                    : totalMaxGainKg < -0.01
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }`}
              >
                {points.length >= 2 ? `${formatDeltaKg(totalMaxGainKg)} kg` : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">
                {activePoint ? formatShortDate(activePoint.week.startDate) : 'Selected Week'}
              </span>
              <span className="font-mono tabular-nums font-semibold text-orange-600">
                {activePoint
                  ? formatWeightRangeKg(
                      activePoint.entry.minWeightKg,
                      activePoint.entry.maxWeightKg
                    )
                  : 'No logs'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-orange-600 inline-block" aria-hidden="true" />
            <span>Max (kg)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 border-t-2 border-dashed border-slate-500 inline-block"
              aria-hidden="true"
            />
            <span>Min (kg)</span>
          </span>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-sm text-slate-600">
            No weekly entries recorded for {exercise.name} yet.
          </p>
          {onClickWeek && weeks[0] && (
            <button
              type="button"
              onClick={() => onClickWeek(weeks[0].id)}
              className="mt-3 px-4 py-2 min-h-[38px] rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Log First Week
            </button>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[500px] h-auto select-none"
            role="img"
            aria-label={`${exercise.name} week-by-week minimum and maximum weight progression chart`}
          >
            {yTicks.map((tick, i) => {
              const y = yForValue(tick);
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray={i === 0 ? undefined : '4 4'}
                    strokeWidth={1}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[11px] font-mono tabular-nums"
                  >
                    {formatNumber(Math.round(tick * 10) / 10)}
                  </text>
                </g>
              );
            })}

            {chartWeeks.map((wk, idx) => {
              const x = xForWeekIdx(idx);
              const hasData = entryByWeek.has(wk.id);
              return (
                <text
                  key={wk.id}
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[11px] font-mono ${
                    hasData ? 'fill-slate-700 font-medium' : 'fill-slate-400'
                  }`}
                >
                  {formatShortDate(wk.startDate)}
                </text>
              );
            })}

            {bandPath && <path d={bandPath} fill="#EA580C" fillOpacity={0.1} />}

            {points.length >= 2 && (
              <>
                <polyline
                  fill="none"
                  stroke="#64748B"
                  strokeWidth={1.75}
                  strokeDasharray="4 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={minPolyline}
                />
                <polyline
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={maxPolyline}
                />
              </>
            )}

            {points.map((pt) => {
              const cx = xForWeekIdx(pt.weekIdx);
              const cyMax = yForValue(pt.maxVal);
              const cyMin = yForValue(pt.minVal);
              const isFocused = activePoint?.week.id === pt.week.id;
              const isPR =
                allTimeBestMaxKg > 0 && pt.entry.maxWeightKg >= allTimeBestMaxKg - 0.01;

              return (
                <g key={pt.week.id}>
                  {isFocused && (
                    <line
                      x1={cx}
                      y1={padTop}
                      x2={cx}
                      y2={padTop + plotH}
                      stroke="#CBD5E1"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  )}
                  <line
                    x1={cx}
                    y1={cyMin}
                    x2={cx}
                    y2={cyMax}
                    stroke={isFocused ? '#EA580C' : '#CBD5E1'}
                    strokeWidth={isFocused ? 2 : 1.5}
                  />
                  <circle
                    cx={cx}
                    cy={cyMin}
                    r={isFocused ? 4 : 3}
                    fill="#FFFFFF"
                    stroke="#64748B"
                    strokeWidth={2}
                  />
                  {isPR && (
                    <circle
                      cx={cx}
                      cy={cyMax}
                      r={8}
                      fill="none"
                      stroke="#EA580C"
                      strokeOpacity={0.35}
                      strokeWidth={2}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cyMax}
                    r={isFocused ? 5.5 : 4}
                    fill={isFocused ? '#EA580C' : '#FFFFFF'}
                    stroke="#EA580C"
                    strokeWidth={2.5}
                  />
                  <circle
                    cx={cx}
                    cy={(cyMax + cyMin) / 2}
                    r={22}
                    fill="transparent"
                    className={onClickWeek ? 'cursor-pointer' : 'cursor-default'}
                    onMouseEnter={() => setHoveredWeekId(pt.week.id)}
                    onClick={() => onClickWeek?.(pt.week.id)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
