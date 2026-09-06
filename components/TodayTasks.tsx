'use client'

import { useState } from 'react'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import {
  dayNumber,
  weekNumber,
  streak,
  weekProgress,
  month1Checks,
  tasksForDay,
} from '@/lib/progress/selectors'
import type { Track } from '@/lib/progress/selectors'
import { labelForTask, completionKey, content } from '@/lib/content/index'
import type { DayTask } from '@/lib/content/schema'
import { addDays, todayIso } from '@/lib/date'
import Checkbox from './Checkbox'
import Meter from './Meter'
import StartDateSetup from './StartDateSetup'

const TOTAL_DAYS = 180
const MONTH1_LAST_DAY = 30
const WEEKLY_HOURS_TARGET = 22.5

const TRACK_ORDER: Track[] = ['dsa', 'study-sd', 'study-ml', 'reading', 'build', 'review']
const TRACK_LABELS: Record<Track, string> = {
  dsa: 'DSA',
  'study-sd': 'System design',
  'study-ml': 'AI/ML',
  reading: 'Reading',
  build: 'Build',
  review: 'Review',
}

function groupByTrack(tasks: DayTask[]): Array<[Track, DayTask[]]> {
  const groups = new Map<Track, DayTask[]>()
  for (const task of tasks) {
    const bucket = groups.get(task.track)
    if (bucket) bucket.push(task)
    else groups.set(task.track, [task])
  }
  return TRACK_ORDER.filter((t) => groups.has(t)).map((t) => [t, groups.get(t)!])
}

function SkeletonRow({ width = 'w-full' }: { width?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-11 ${width} animate-pulse rounded-[var(--radius-sm)] bg-[var(--track)]`}
    />
  )
}

/** Client component that renders the whole Today body: tasks, streak, meters. */
export default function TodayTasks() {
  const hydrated = useHydrated()
  const startDate = useProgress((s) => s.startDate)
  const completed = useProgress((s) => s.completed)
  const hours = useProgress((s) => s.hours)

  // Latched by a lazy initializer rather than set from an effect: the value is
  // wanted once, on the client, and an effect would only re-render to reach the
  // same answer (https://react.dev/learn/you-might-not-need-an-effect). The
  // server's own initializer result is never rendered — `hydrated` is false in
  // server markup and on the hydrating render, so both sides paint the skeleton
  // and the client's clock is the only one that ever reaches the screen.
  const [today] = useState(todayIso)

  const ready = hydrated

  if (!ready) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonRow width="w-40" />
        <div className="panel flex flex-col gap-2 p-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    )
  }

  if (startDate === null) {
    return <StartDateSetup />
  }

  const day = dayNumber(startDate, today)!
  const week = weekNumber(startDate, today)!
  const days = streak(completed, today)

  const weekStart = addDays(startDate, (week - 1) * 7)
  let logged = 0
  let anyLogged = false
  for (let i = 0; i < 7; i += 1) {
    const entry = hours[addDays(weekStart, i)]
    if (typeof entry === 'number') {
      logged += entry
      anyLogged = true
    }
  }
  const progress = weekProgress(week, completed)
  const hoursDone = anyLogged
    ? Math.round(logged * 10) / 10
    : Math.round((progress.completedTotal / 60) * 10) / 10

  // The week's planned minutes split by track. One aggregate bar cannot say
  // which track fell behind, which is the only question this section is asked.
  // Minutes, not hours: the plan is authored in minutes, and a track worth a
  // quarter of an hour reads as "0/15", not "0/0.2".
  const trackMeters = TRACK_ORDER.filter((t) => progress.planned[t] > 0).map((track) => ({
    track,
    done: progress.completed[track],
    target: progress.planned[track],
  }))

  const month1 = month1Checks(completed)
  const inMonth1 = day <= MONTH1_LAST_DAY
  const dayTasks = inMonth1 ? tasksForDay(day) : []
  const weekTargets = content.weeks.find((w) => w.number === week)?.targets ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>
          Day {day} of {TOTAL_DAYS}
        </h1>
        <p className="readout mt-1 text-[var(--text-muted)]">
          Week {week}
          <span className="mx-2 text-[var(--text-faint)]">·</span>
          <span className={days > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'}>
            {days} day streak
          </span>
        </p>
      </div>

      {inMonth1 ? (
        <div className="flex flex-col gap-4">
          {dayTasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nothing scheduled today. Rest day.</p>
          ) : (
            groupByTrack(dayTasks).map(([track, tasks]) => (
              <section key={track} className="panel flex flex-col gap-1 p-3">
                <h2 className="eyebrow px-2 pb-1">{TRACK_LABELS[track]}</h2>
                {tasks.map((task) => {
                  const id = completionKey(task)
                  const label = labelForTask(task.refId)
                  return (
                    <Checkbox
                      key={id}
                      itemId={id}
                      labelText={label}
                      label={
                        <span className="flex flex-col">
                          <span>{label}</span>
                          {task.note ? (
                            <span className="mt-0.5 text-xs text-[var(--text-faint)]">
                              {task.note}
                            </span>
                          ) : null}
                        </span>
                      }
                      meta={`${task.minutes}m`}
                    />
                  )
                })}
              </section>
            ))
          )}
        </div>
      ) : (
        <section className="panel flex flex-col gap-2 p-4">
          <h2>This week</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {weekTargets.map((target) => (
              <li key={target} className="flex gap-2">
                <span className="text-[var(--text-faint)]">·</span>
                <span>{target}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel flex flex-col gap-4 p-4">
        <h2>Streak and hours</h2>
        <Meter label="Weekly hours" done={hoursDone} target={WEEKLY_HOURS_TARGET} />

        {trackMeters.length > 0 ? (
          <>
            <h3 className="eyebrow">This week by track · minutes</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {trackMeters.map(({ track, done, target }) => (
                <Meter key={track} label={TRACK_LABELS[track]} done={done} target={target} />
              ))}
              <Meter
                label="All tracks"
                done={progress.completedTotal}
                target={progress.plannedTotal}
              />
            </div>
          </>
        ) : null}
      </section>

      <section className="panel flex flex-col gap-4 p-4">
        <h2>Month 1 checks</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Meter label="Problems solved" done={month1.problems.done} target={month1.problems.target} />
          <Meter label="Patterns covered" done={month1.patterns.done} target={month1.patterns.target} />
          <Meter
            label="Milestones accepted"
            done={month1.milestones.done}
            target={month1.milestones.target}
          />
          <Meter label="Defense docs" done={month1.docs.done} target={month1.docs.target} />
        </div>
      </section>
    </div>
  )
}
