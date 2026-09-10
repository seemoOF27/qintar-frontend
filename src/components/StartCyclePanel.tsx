import { useState } from 'react'
import { useConfirmCycle, usePreviewCycle } from '@/api/hooks/useMoneyResources'
import { Money } from '@/components/ui/Money'
import { Button, Card, Field, MoneyInput, Notice } from '@/components/ui/Primitives'
import { ApiError } from '@/api/client'

/**
 * بدء رحلة راتب.
 *
 * **مسارَان منفصلان عمدًا**: المعاينة تعرض الملخص ولا تكتب حرفًا، والتأكيد
 * وحده ينشئ الرحلة — القاعدة التاسعة: لا `SalaryCycle` تلقائي أبدًا.
 *
 * فلا يمكن أن تبدأ رحلة بمجرد فتح الشاشة أو كتابة رقم.
 */
export function StartCyclePanel() {
  const preview = usePreviewCycle()
  const confirm = useConfirmCycle()
  const [amount, setAmount] = useState('')

  const summary = preview.data
  const error = (preview.error ?? confirm.error) instanceof ApiError
    ? ((preview.error ?? confirm.error) as ApiError)
    : null

  return (
    <Card>
      <h2 className="mb-[var(--space-3)] font-semibold">ابدأ رحلة راتب</h2>

      <form
        className="flex flex-col gap-[var(--space-3)]"
        onSubmit={(event) => {
          event.preventDefault()
          preview.mutate(amount)
        }}
      >
        <Field label="مبلغ الراتب" hint="بخانتين عشريتين على الأكثر" error={error?.fieldError('income_amount')}>
          <MoneyInput
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="15000.00"
            required
          />
        </Field>

        <Button type="submit" variant="ghost" disabled={amount === '' || preview.isPending}>
          {preview.isPending ? 'يحسب…' : 'اعرض الملخص'}
        </Button>
      </form>

      {summary !== undefined && (
        <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
          <Notice tone="info">
            هذا ملخص فقط. **لن تبدأ الرحلة حتى تؤكد**، ولم يُحفظ شيء بعد.
          </Notice>

          <dl className="grid grid-cols-2 gap-[var(--space-2)] text-[length:var(--text-caption)]">
            <dt className="text-[color:var(--color-ink-muted)]">الاستثمار</dt>
            <dd><Money amount={summary.investment_deduction} /></dd>

            <dt className="text-[color:var(--color-ink-muted)]">الطوارئ</dt>
            <dd><Money amount={summary.emergency_deduction} /></dd>

            <dt className="text-[color:var(--color-ink-muted)]">أساس الميزانيات</dt>
            <dd><Money amount={summary.allocation_base} /></dd>

            <dt className="text-[color:var(--color-ink-muted)]">مساهمات الحصالات</dt>
            <dd><Money amount={summary.piggy_bank_contributions} /></dd>
          </dl>

          {summary.previous_cycle !== null && (
            <div className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-[var(--space-3)] text-[length:var(--text-caption)]">
              <p className="mb-[var(--space-1)] font-medium">الرحلة الحالية ستُقفل</p>
              <p>
                صرفت منها <Money amount={summary.previous_cycle.spent_amount} />، ويُتوقع أن ينتقل
                فائض قدره <Money amount={summary.projected_surplus} /> إلى الاستثمار والطوارئ.
              </p>
            </div>
          )}

          {summary.budgets.length > 0 && (
            <div>
              <p className="mb-[var(--space-2)] text-[length:var(--text-caption)] font-medium">
                قيم الميزانيات بعد التجديد
              </p>
              <ul className="flex flex-col gap-[var(--space-1)] text-[length:var(--text-caption)]">
                {summary.budgets.map((budget) => (
                  <li key={budget.id} className="flex justify-between">
                    <span>{budget.name}</span>
                    <span>
                      <Money amount={budget.current_amount} tone="muted" /> ←{' '}
                      <Money amount={budget.next_amount} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error !== null && <Notice tone="danger">{error.message}</Notice>}

          <Button
            type="button"
            disabled={confirm.isPending}
            onClick={() =>
              confirm.mutate(
                { income_amount: amount, trigger_method: 'manual' },
                { onSuccess: () => preview.reset() },
              )
            }
          >
            {confirm.isPending ? 'يبدأ…' : 'أكّد وابدأ الرحلة'}
          </Button>
        </div>
      )}
    </Card>
  )
}
