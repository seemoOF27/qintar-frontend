import { InstallPrompt } from '@/components/InstallPrompt'
import { Link } from 'react-router-dom'
import { useActiveCycle, useBudgets, useCommitments } from '@/api/hooks/useMoneyResources'
import { useStatistics } from '@/api/hooks/useLedger'
import { Money } from '@/components/ui/Money'
import { Card, EmptyState, Notice } from '@/components/ui/Primitives'
import { percentOf } from '@/lib/money'
import { StartCyclePanel } from '@/components/StartCyclePanel'

/**
 * الرئيسية.
 *
 * الأرقام الأربعة الحسّاسة — الراتب والمتبقي والفائض وإجمالي الميزانيات —
 * تُطمس بزر العين. **والميزانيات نفسها تبقى ظاهرة دائمًا**: إخفاؤها يجعل
 * الشاشة بلا فائدة.
 */
export function DashboardScreen() {
  const { data: cycle, isPending } = useActiveCycle()
  const { data: budgetData } = useBudgets()
  const { data: commitments } = useCommitments()
  const statistics = useStatistics({ period: 'salary_cycle' })

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  if (cycle === null) {
    return (
      <div className="flex flex-col gap-[var(--space-4)]">
        <EmptyState title="ما بدأت رحلة راتب بعد. ابدأ واحدة لتظهر أرقامك." />
        <StartCyclePanel />
      </div>
    )
  }

  const budgets = budgetData?.budgets ?? []
  const unpaid = (commitments ?? []).filter((c) => !c.is_paid_current_cycle)

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {/* يظهر مرة، ومن رفضه لا يُسأل ثانية — والزر يبقى في الإعدادات. */}
      <InstallPrompt />

      <Card>
        <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          المتبقي من الرحلة
        </p>
        <div className="mt-[var(--space-1)]">
          <Money amount={cycle.available_balance} sensitive size="figure" />
        </div>

        <dl className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] text-[length:var(--text-caption)]">
          <div>
            <dt className="text-[color:var(--color-ink-muted)]">الدخل</dt>
            <dd>
              <Money amount={cycle.total_income} sensitive />
            </dd>
          </div>
          <div>
            <dt className="text-[color:var(--color-ink-muted)]">المصروف</dt>
            <dd>
              <Money amount={cycle.spent_amount} sensitive />
            </dd>
          </div>
          <div>
            <dt className="text-[color:var(--color-ink-muted)]">الاستثمار</dt>
            <dd>
              <Money amount={cycle.investment_allocated} sensitive />
            </dd>
          </div>
          <div>
            <dt className="text-[color:var(--color-ink-muted)]">الطوارئ</dt>
            <dd>
              <Money amount={cycle.emergency_allocated} sensitive />
            </dd>
          </div>
        </dl>
      </Card>

      {budgetData?.allocation?.exceeds === true && (
        <Notice tone="warning">
          مجموع ميزانياتك تجاوز المتاح بـ <Money amount={budgetData.allocation.over_by} />.{' '}
          <Link to="/funds" className="underline">
            عدّل نسب الاستثمار والطوارئ
          </Link>{' '}
          أو قلّص ميزانية.
        </Notice>
      )}

      <section className="flex flex-col gap-[var(--space-2)]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">الميزانيات</h2>
          <Link
            to="/budgets"
            className="text-[length:var(--text-caption)] text-[color:var(--color-brand-primary)]"
          >
            الكل
          </Link>
        </div>

        {budgets.length === 0 && <EmptyState title="ما عندك ميزانيات بعد." />}

        {budgets.slice(0, 5).map((budget) => {
          const row = statistics.data?.spending.by_budget.find((b) => b.id === budget.id)
          const spent = row?.spent ?? '0.00'
          const share = percentOf(spent, budget.computed_amount)
          const over = row !== undefined && row.overspent_by !== '0.00'

          return (
            <Card key={budget.id}>
              <div className="flex items-baseline justify-between gap-[var(--space-2)]">
                <span className={budget.is_archived ? 'text-[color:var(--color-ink-muted)]' : ''}>
                  {budget.name}
                  {budget.is_archived && ' · معطّلة'}
                </span>
                {/* الميزانية نفسها ليست حسّاسة: إخفاؤها يفرّغ الشاشة. */}
                <span className="text-[length:var(--text-caption)]">
                  <Money amount={spent} /> من <Money amount={budget.computed_amount} />
                </span>
              </div>

              <div
                className="mt-[var(--space-2)] h-2 overflow-hidden rounded-[var(--radius-full)] bg-[color:var(--color-surface-sunken)]"
                role="progressbar"
                aria-valuenow={Math.min(share, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-[var(--radius-full)]"
                  style={{
                    width: `${Math.min(share, 100)}%`,
                    background: over
                      ? 'var(--color-state-danger)'
                      : 'var(--color-brand-primary)',
                  }}
                />
              </div>

              {over && (
                <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-state-danger)]">
                  تجاوزت بـ <Money amount={row.overspent_by} tone="danger" />
                </p>
              )}
            </Card>
          )
        })}
      </section>

      {unpaid.length > 0 && (
        <section className="flex flex-col gap-[var(--space-2)]">
          <h2 className="font-semibold">التزامات ما سُدّدت</h2>
          {unpaid.map((commitment) => (
            <Card key={commitment.id}>
              <div className="flex items-center justify-between">
                <span>{commitment.name}</span>
                <span className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                  يوم {commitment.due_day_this_month} · <Money amount={commitment.amount} />
                </span>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}
