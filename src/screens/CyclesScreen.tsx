import { useCycles } from '@/api/hooks/useMoneyResources'
import { Money } from '@/components/ui/Money'
import { Card, EmptyState } from '@/components/ui/Primitives'
import { StartCyclePanel } from '@/components/StartCyclePanel'

export function CyclesScreen() {
  const { data, isPending } = useCycles()

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">رحلات الرواتب</h1>

      {(data ?? []).length === 0 && <EmptyState title="ما بدأت رحلة بعد." />}

      {(data ?? []).map((cycle) => (
        <Card key={cycle.id}>
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p>
                {cycle.start_date}
                {cycle.end_date === null ? ' — جارية' : ` إلى ${cycle.end_date}`}
              </p>
              <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                {cycle.status === 'active' ? 'نشطة' : 'مقفلة'}
              </p>
            </div>
            <Money amount={cycle.total_income} sensitive size="title" />
          </div>

          <dl className="mt-[var(--space-3)] grid grid-cols-2 gap-[var(--space-2)] text-[length:var(--text-caption)]">
            <dt className="text-[color:var(--color-ink-muted)]">المصروف</dt>
            <dd><Money amount={cycle.spent_amount} sensitive /></dd>
            <dt className="text-[color:var(--color-ink-muted)]">المتبقي</dt>
            <dd><Money amount={cycle.available_balance} sensitive /></dd>
          </dl>
        </Card>
      ))}

      <StartCyclePanel />
    </div>
  )
}
