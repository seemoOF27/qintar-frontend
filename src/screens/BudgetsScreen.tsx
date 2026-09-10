import { useState } from 'react'
import {
  useBudgets,
  useDeleteBudget,
  useRestoreBudget,
  useSaveBudget,
} from '@/api/hooks/useMoneyResources'
import { Money } from '@/components/ui/Money'
import { Button, Card, EmptyState, Field, Input, MoneyInput, Notice, Select } from '@/components/ui/Primitives'
import { ApiError } from '@/api/client'

/**
 * الميزانيات.
 *
 * القرار 12.9: حذف ميزانية **بلا مصروفات** يخفيها فورًا، و**بها مصروفات**
 * يبقيها معطّلة للعرض حتى نهاية الرحلة ثم تختفي. والاستعادة ممكنة دائمًا.
 */
export function BudgetsScreen() {
  const { data, isPending } = useBudgets()
  const save = useSaveBudget()
  const remove = useDeleteBudget()
  const restore = useRestoreBudget()

  const [draft, setDraft] = useState({ name: '', allocation_type: 'fixed', allocation_value: '' })
  const [notice, setNotice] = useState<string | null>(null)

  const error = (save.error ?? remove.error) instanceof ApiError
    ? ((save.error ?? remove.error) as ApiError)
    : null

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  const budgets = data?.budgets ?? []
  const allocation = data?.allocation

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">الميزانيات</h1>

      {allocation !== null && allocation !== undefined && (
        <Card>
          <dl className="grid grid-cols-2 gap-[var(--space-2)] text-[length:var(--text-caption)]">
            <dt className="text-[color:var(--color-ink-muted)]">المتاح للتوزيع</dt>
            <dd><Money amount={allocation.base} sensitive /></dd>
            <dt className="text-[color:var(--color-ink-muted)]">الموزَّع</dt>
            <dd><Money amount={allocation.allocated} sensitive /></dd>
          </dl>

          {allocation.exceeds && (
            <div className="mt-[var(--space-3)]">
              <Notice tone="warning">
                تجاوزت المتاح بـ <Money amount={allocation.over_by} />. التطبيق يحفظ ما تريد ولا
                يمنعك، لكن الرقم يقول الحقيقة.
              </Notice>
            </div>
          )}
        </Card>
      )}

      {notice !== null && <Notice tone="info">{notice}</Notice>}
      {error !== null && <Notice tone="danger">{error.message}</Notice>}

      {budgets.length === 0 && <EmptyState title="ما عندك ميزانيات بعد." />}

      {budgets.map((budget) => (
        <Card key={budget.id}>
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p className={budget.is_archived ? 'text-[color:var(--color-ink-muted)]' : ''}>
                {budget.name}
                {budget.is_archived && ' · معطّلة حتى نهاية الرحلة'}
              </p>
              <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                {budget.allocation_type === 'percentage'
                  ? `${budget.allocation_value}٪ من الأساس`
                  : 'مبلغ ثابت'}
              </p>
            </div>

            <Money amount={budget.computed_amount} />
          </div>

          <div className="mt-[var(--space-3)] flex gap-[var(--space-2)]">
            {budget.is_archived ? (
              <Button variant="ghost" onClick={() => restore.mutate(budget.id)}>
                استعادة
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() =>
                  remove.mutate(budget.id, {
                    onSuccess: (result) =>
                      setNotice(
                        result.stays_visible_until_cycle_ends
                          ? 'فيها مصروفات، فتبقى ظاهرة معطّلة حتى نهاية الرحلة. تقدر تستعيدها.'
                          : 'حُذفت، ومبلغها يعود للفائض عند إقفال الرحلة.',
                      ),
                  })
                }
              >
                حذف
              </Button>
            )}
          </div>
        </Card>
      ))}

      <Card>
        <h2 className="mb-[var(--space-3)] font-semibold">ميزانية جديدة</h2>

        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate(draft as never, {
              onSuccess: () => setDraft({ name: '', allocation_type: 'fixed', allocation_value: '' }),
            })
          }}
        >
          <Field label="الاسم">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
          </Field>

          <Field label="طريقة التحديد">
            <Select
              value={draft.allocation_type}
              onChange={(e) => setDraft({ ...draft, allocation_type: e.target.value })}
            >
              <option value="fixed">مبلغ ثابت</option>
              <option value="percentage">نسبة من الأساس</option>
            </Select>
          </Field>

          <Field
            label={draft.allocation_type === 'percentage' ? 'النسبة' : 'المبلغ'}
            error={error?.fieldError('allocation_value')}
          >
            <MoneyInput
              value={draft.allocation_value}
              onChange={(e) => setDraft({ ...draft, allocation_value: e.target.value })}
              placeholder={draft.allocation_type === 'percentage' ? '30' : '1000.00'}
              required
            />
          </Field>

          <Button type="submit" disabled={save.isPending}>
            أضف
          </Button>
        </form>
      </Card>
    </div>
  )
}
