'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chip from '@/components/ui/Chip'
import Dialog from '@/components/ui/Dialog'
import Divider from '@/components/ui/Divider'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Meter from '@/components/ui/Meter'
import NumberInput from '@/components/ui/NumberInput'
import Panel from '@/components/ui/Panel'
import Select from '@/components/ui/Select'
import Sheet from '@/components/ui/Sheet'
import Skeleton from '@/components/ui/Skeleton'
import Stat from '@/components/ui/Stat'
import Switch from '@/components/ui/Switch'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Textarea from '@/components/ui/Textarea'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Tooltip from '@/components/ui/Tooltip'

/**
 * The component gallery.
 *
 * Every primitive, in every state that matters, on one page. It exists to be
 * looked at — on a phone, in both themes — before any feature is built on top
 * of these, because a primitive that is wrong is wrong in forty places later.
 *
 * Two rules this page has to obey itself, since it is the reference:
 *
 * - No glass inside glass. Sections are plain elements on the Ground; the
 *   glass tiers are the exhibits, never the frame. A `.panel` wrapping a
 *   `.card` is exactly the nested-blur case the design system forbids.
 * - The sample content is diet, workout and task data rather than lorem
 *   ipsum, because the mini-apps these were built for are the real test of
 *   whether a Stat or an EmptyState is shaped correctly.
 */

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="eyebrow">{title}</h2>
        {note ? <p className="hint">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** A row of exhibits that wraps rather than scrolling the page sideways. */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
}

/**
 * Overlays live in their own component because `useToast` has to be called
 * under the `ToastProvider` that renders the live regions — a hook cannot read
 * a provider its own component mounts.
 */
function Overlays() {
  const toast = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <Section
        title="Overlays"
        note="Focus moves in on open and returns to the trigger on close. Escape closes. The page behind is inert, not merely hidden — an aria-hidden page is still focusable, which is the escaped-focus bug."
      >
        <Row>
          <Button
            variant="quiet"
            aria-haspopup="dialog"
            aria-expanded={dialogOpen}
            onClick={() => setDialogOpen(true)}
          >
            Open dialog
          </Button>
          <Button
            variant="quiet"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            Open sheet
          </Button>
        </Row>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Delete this log?"
          description="Tuesday's entry — 1,940 calories across four meals. This cannot be undone."
          footer={
            <>
              <Button variant="quiet" onClick={() => setDialogOpen(false)}>
                Keep it
              </Button>
              <Button variant="danger" onClick={() => setDialogOpen(false)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-[var(--text-muted)]">
            Tab around — focus is trapped here and wraps at both ends. Escape closes, and focus
            lands back on the button that opened this.
          </p>
        </Dialog>

        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Add a meal"
          description="The same overlay engine as the dialog, presented from the bottom edge."
          footer={
            <Button variant="accent" onClick={() => setSheetOpen(false)}>
              Save meal
            </Button>
          }
        >
          <div className="flex min-w-0 flex-col gap-4">
            <Field label="What did you eat?">
              <Input placeholder="Dal and two rotis" />
            </Field>
            <Field label="Calories">
              <Input inputMode="decimal" placeholder="420" />
            </Field>
          </div>
        </Sheet>
      </Section>

      <Section title="Tabs" note="Arrow keys move between tabs, Home and End jump to the ends, and Tab leaves the tablist entirely.">
        <Tabs
          label="Nutrition breakdown"
          items={[
            {
              id: 'today',
              label: 'Today',
              content: (
                <Panel tier="solid" className="flex flex-col gap-4 p-4">
                  <Meter value={62} label="Protein today" showValue />
                  <Meter value={81} label="Calories today" showValue />
                </Panel>
              ),
            },
            {
              id: 'week',
              label: 'This week',
              content: (
                <Panel tier="solid" className="p-4">
                  <p className="text-sm text-[var(--text-muted)]">
                    Averaging 2,180 calories against a 2,050 target.
                  </p>
                </Panel>
              ),
            },
            { id: 'locked', label: 'Month', content: <p>Not enough data yet.</p>, disabled: true },
          ]}
        />
      </Section>

      <Section
        title="Toasts and tooltips"
        note="A toast announces without stealing focus. A tooltip opens on keyboard focus too — tab to the button below rather than hovering it."
      >
        <Row>
          <Button variant="quiet" onClick={() => toast.show({ message: 'Meal logged.' })}>
            Show toast
          </Button>
          <Button
            variant="quiet"
            onClick={() =>
              toast.show({
                message: 'Could not reach the server. Your entry is saved locally.',
                tone: 'error',
                action: { label: 'Retry', onClick: () => undefined },
              })
            }
          >
            Show error toast
          </Button>
          <Tooltip label="Body mass index, from your latest weight and height.">
            <Button variant="quiet">What is BMI?</Button>
          </Tooltip>
        </Row>
      </Section>
    </>
  )
}

export default function KitPage() {
  const [protein, setProtein] = useState<number | null>(38)
  const [weight, setWeight] = useState<number | null>(null)
  const [notify, setNotify] = useState(true)
  const [meal, setMeal] = useState('breakfast')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('today')

  return (
    <div className="flex min-w-0 flex-col gap-8 pb-10">
      <header className="flex min-w-0 flex-col gap-2">
        <p className="eyebrow">Design system</p>
        <h1>Component kit</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Every primitive the app is built from, in the states that matter. Toggle the theme in the
          top bar — anything that only works in one theme is a bug on this page, not on the page
          that uses it.
        </p>
      </header>

      <Divider />

      <Section
        title="Buttons"
        note="Three variants. Accent is the one action a screen is for; quiet is everything else; danger is destructive and must never be mistaken for quiet."
      >
        <Row>
          <Button variant="accent">Log this meal</Button>
          <Button variant="quiet">Cancel</Button>
          <Button variant="danger">Erase everything</Button>
        </Row>
        <Row>
          <Button variant="accent" disabled>
            Disabled
          </Button>
          <Button
            variant="accent"
            loading={loading}
            onClick={() => {
              setLoading(true)
              window.setTimeout(() => setLoading(false), 1600)
            }}
          >
            {loading ? 'Saving' : 'Click to load'}
          </Button>
        </Row>
      </Section>

      <Section
        title="Surfaces"
        note="Three tiers and only three. A glass tier never contains another glass tier — nested blur is the one rule the whole system rests on."
      >
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          <Panel tier="panel" className="p-4">
            <p className="eyebrow">Panel</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Cards, rows, nav, top bar. Translucent with a hairline.
            </p>
          </Panel>
          <Panel tier="raised" className="p-4">
            <p className="eyebrow">Raised</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Sheets, dialogs, popovers. More blur, stronger border, a shadow.
            </p>
          </Panel>
          <Panel tier="solid" className="p-4">
            <p className="eyebrow">Solid</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              What you nest inside glass. Code blocks and diagrams always live here.
            </p>
          </Panel>
        </div>
      </Section>

      <Section title="Cards" note="A card that navigates is a real anchor, not a div with a click handler.">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <Card href="/today" className="flex flex-col gap-1 p-4">
            <p className="eyebrow">Link card</p>
            <p className="text-sm text-[var(--text-muted)]">
              Keyboard reachable, right-clickable, opens in a new tab like any link.
            </p>
          </Card>
          <Card as="button" onClick={() => undefined} className="flex flex-col gap-1 p-4 text-left">
            <p className="eyebrow">Button card</p>
            <p className="text-sm text-[var(--text-muted)]">
              For a card that acts rather than navigates.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Stats" note="A number that is the point of its own block. Tabular, so it does not reflow as it counts.">
        <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
          <Panel tier="solid" className="p-4">
            <Stat value="1,840" label="Calories today" unit="/ 2,050" />
          </Panel>
          <Panel tier="solid" className="p-4">
            <Stat value="78.4" label="Weight" unit="kg" />
          </Panel>
          <Panel tier="solid" className="p-4">
            <Stat value="24.1" label="BMI" />
          </Panel>
          <Panel tier="solid" className="p-4">
            <Stat value="12" label="Day streak" />
          </Panel>
        </div>
      </Section>

      <Section title="Meters" note="Always paired with the number. A bar on its own is not an answer.">
        <Panel tier="solid" className="flex flex-col gap-4 p-4">
          <Meter value={62} label="Protein" showValue />
          <Meter value={100} label="Calories" showValue />
          <Meter value={0} label="Workouts this week" showValue />
          <Meter value={140} max={100} label="Clamped over maximum" showValue />
        </Panel>
      </Section>

      <Section title="Tags and chips" note="A tag labels. A chip is pressed. The difference is whether it is a tap target.">
        <Row>
          <Tag>Easy</Tag>
          <Tag variant="outline">Amazon</Tag>
          <Tag variant="accent">Core</Tag>
        </Row>
        <Row>
          {(['all', 'today', 'week'] as const).map((f) => (
            <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This week'}
            </Chip>
          ))}
          <Chip disabled>Disabled</Chip>
        </Row>
      </Section>

      <Section
        title="Form controls"
        note="Labels, hints and errors are wired to their control automatically — the id plumbing is the whole reason Field exists."
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Field label="Meal name" hint="What you would call it, not what a database calls it.">
            <Input placeholder="Dal and two rotis" />
          </Field>

          <Field label="Protein" hint="Grams.">
            <NumberInput value={protein} onChange={setProtein} />
          </Field>

          <Field
            label="Weight"
            error={weight !== null && weight <= 0 ? 'Weight has to be greater than zero.' : undefined}
            hint="Blank is not zero — an empty field stays empty."
          >
            <NumberInput value={weight} onChange={setWeight} placeholder="kg" />
          </Field>

          <Field label="Meal">
            <Select value={meal} onChange={(e) => setMeal(e.target.value)}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </Select>
          </Field>

          <Field label="Notes" className="md:col-span-2">
            <Textarea placeholder="How it went, what you would change." />
          </Field>
        </div>

        <Panel tier="solid" className="flex min-w-0 items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 flex-col">
            <span className="label">Evening reminder</span>
            <span className="hint">Nudges you at 9pm if nothing is logged.</span>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} aria-label="Evening reminder" />
        </Panel>
      </Section>

      <ToastProvider>
        <Overlays />
      </ToastProvider>

      <Section title="Loading and empty" note="An empty state always says what to do next. A dead end is a bug.">
        <Panel tier="solid" className="flex flex-col gap-3 p-4">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </Panel>

        <Panel tier="solid">
          <EmptyState
            title="Nothing logged today"
            description="Yesterday you ate 1,940 calories across four meals."
            action={<Button variant="accent">Log yesterday again</Button>}
          />
        </Panel>
      </Section>
    </div>
  )
}
