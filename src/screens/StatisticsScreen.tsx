import { useState } from 'react'
import { useStatistics } from '@/api/hooks/useLedger'
import { Money } from '@/components/ui/Money'
import { Card, EmptyState, Notice, Select } from '@/components/ui/Primitives'

const periods = [
  { value: 'salary_cycle', label: 'رحلة الراتب' },
  { value: 'month', label: 'الشهر' },
  { value: 'week', label: 'الأسبوع' },
  { value: 'day', label: 'اليوم' },
  { value: 'year', label: 'السنة' },
]

/**
 * الإحصائيات.
 *
 * **مجموع الوسوم قد يتجاوز الإجمالي** لأن العملية قد تحمل وسمين فتُحسب في
 * كليهما. والخادم يعلن ذلك بـ`overlaps`، وتقوله الشاشة صراحةً بدل أن يظن
 * المستخدم أن ثمة خطأً.
 */
export function StatisticsScreen() {
  const [period, setPeriod] = useState('salary_cycle')
  const { data, isPending, isError } = useStatistics({ period })

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <h1 className="text-[length:var(--text-title)] font-semibold">الإحصائيات</h1>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-auto">
          {periods.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {isPending && <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>}
      {isError && <EmptyState title="ما فيه رحلة راتب لهذي المدة." />}

      {data !== undefined && (
        <>
          <Card>
            <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
              {data.period.from} إلى {data.period.to}
            </p>

            <dl className="mt-[var(--space-3)] grid grid-cols-2 gap-[var(--space-3)]">
              <div>
                <dt className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                  الدخل
                </dt>
                <dd><Money amount={data.income.total} sensitive size="title" /></dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                  المصروف
                </dt>
                <dd><Money amount={data.spending.total} sensitive size="title" /></dd>
              </div>
            </dl>

            {data.income.extra !== '0.00' && (
              <p className="mt-[var(--space-2)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                منه دخل إضافي <Money amount={data.income.extra} sensitive />
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-[var(--space-2)] font-semibold">ما تحرّك تلقائيًا</h2>
            <p className="mb-[var(--space-3)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
              اقتطاعات ومساهمات، **ليست صرفًا على شيء** فلا تدخل في رقم المصروفات.
            </p>

            <dl className="grid grid-cols-3 gap-[var(--space-2)] text-[length:var(--text-caption)]">
              <div>
                <dt className="text-[color:var(--color-ink-muted)]">الاستثمار</dt>
                <dd><Money amount={data.automatic.investment} sensitive /></dd>
              </div>
              <div>
                <dt className="text-[color:var(--color-ink-muted)]">الطوارئ</dt>
                <dd><Money amount={data.automatic.emergency} sensitive /></dd>
              </div>
              <div>
                <dt className="text-[color:var(--color-ink-muted)]">الحصالات</dt>
                <dd><Money amount={data.automatic.piggy_banks} sensitive /></dd>
              </div>
            </dl>
          </Card>

          {data.spending.by_budget.length > 0 && (
            <section className="flex flex-col gap-[var(--space-2)]">
              <h2 className="font-semibold">حسب الميزانية</h2>
              {data.spending.by_budget.map((row) => (
                <Card key={row.id}>
                  <div className="flex items-baseline justify-between gap-[var(--space-2)]">
                    <span className={row.is_archived ? 'text-[color:var(--color-ink-muted)]' : ''}>
                      {row.name}
                      {row.is_archived && ' · محذوفة'}
                    </span>
                    <span className="text-[length:var(--text-caption)]">
                      <Money amount={row.spent} /> من <Money amount={row.allocated} />
                    </span>
                  </div>

                  {row.overspent_by !== '0.00' && (
                    <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-state-danger)]">
                      تجاوز بـ <Money amount={row.overspent_by} tone="danger" />
                    </p>
                  )}
                </Card>
              ))}
            </section>
          )}

          {data.spending.by_tag.rows.length > 0 && (
            <section className="flex flex-col gap-[var(--space-2)]">
              <h2 className="font-semibold">حسب الوسم</h2>

              {data.spending.by_tag.overlaps && (
                <Notice tone="info">
                  عملية واحدة قد تحمل وسمين فتُحسب في الاثنين، فمجموع هذي البنود قد يتجاوز
                  إجمالي مصروفاتك. هذا مقصود لا خطأ.
                </Notice>
              )}

              {data.spending.by_tag.rows.map((row) => (
                <Card key={row.id}>
                  <div className="flex justify-between">
                    <span>{row.name}</span>
                    <Money amount={row.spent} />
                  </div>
                </Card>
              ))}
            </section>
          )}

          {data.spending.uncategorised !== '0.00' && (
            <Notice tone="warning">
              <Money amount={data.spending.uncategorised} /> بلا تصنيف. صنّفها لتظهر في التفصيل.
            </Notice>
          )}
        </>
      )}
    </div>
  )
}
