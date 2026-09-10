import { useState } from 'react'
import {
  useDeletePiggyBank,
  usePiggyBanks,
  useSavePiggyBank,
  useWithdrawFromPiggyBank,
} from '@/api/hooks/useMoneyResources'
import { Money } from '@/components/ui/Money'
import { Button, Card, EmptyState, Field, Input, MoneyInput, Notice } from '@/components/ui/Primitives'
import { ApiError } from '@/api/client'
import { percentOf } from '@/lib/money'

/**
 * الحصالات.
 *
 * **السحب مالٌ يعود** إلى رصيد الرحلة، ويترك عملية واردة في السجل.
 * **والحذف ممنوع ما دام فيها رصيد**: لا يختفي مال صامتًا ولا يعود صامتًا.
 */
export function PiggyBanksScreen() {
  const { data, isPending } = usePiggyBanks()
  const save = useSavePiggyBank()
  const withdraw = useWithdrawFromPiggyBank()
  const remove = useDeletePiggyBank()

  const [draft, setDraft] = useState({ name: '', monthly_contribution: '', target_amount: '' })
  const [withdrawing, setWithdrawing] = useState<{ id: number; amount: string } | null>(null)

  const error = (withdraw.error ?? remove.error ?? save.error) instanceof ApiError
    ? ((withdraw.error ?? remove.error ?? save.error) as ApiError)
    : null

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">الحصالات</h1>

      {error !== null && <Notice tone="danger">{error.message}</Notice>}

      {(data ?? []).length === 0 && <EmptyState title="ما عندك حصالات بعد." />}

      {(data ?? []).map((bank) => (
        <Card key={bank.id}>
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p>{bank.name}</p>
              <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                <Money amount={bank.monthly_contribution} /> كل رحلة
              </p>
            </div>
            <Money amount={bank.current_balance} sensitive size="title" />
          </div>

          {bank.target_amount !== null && (
            <div className="mt-[var(--space-2)]">
              <div className="h-2 overflow-hidden rounded-[var(--radius-full)] bg-[color:var(--color-surface-sunken)]">
                <div
                  className="h-full bg-[color:var(--color-brand-primary)]"
                  style={{
                    width: `${Math.min(percentOf(bank.current_balance, bank.target_amount), 100)}%`,
                  }}
                />
              </div>
              <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                الهدف <Money amount={bank.target_amount} />
              </p>
            </div>
          )}

          {withdrawing?.id === bank.id ? (
            <form
              className="mt-[var(--space-3)] flex flex-col gap-[var(--space-2)]"
              onSubmit={(event) => {
                event.preventDefault()
                withdraw.mutate(
                  { id: bank.id, amount: withdrawing.amount },
                  { onSuccess: () => setWithdrawing(null) },
                )
              }}
            >
              <Field label="مبلغ السحب" hint="يعود إلى رصيد رحلتك">
                <MoneyInput
                  value={withdrawing.amount}
                  onChange={(e) => setWithdrawing({ id: bank.id, amount: e.target.value })}
                  autoFocus
                  required
                />
              </Field>

              <div className="flex gap-[var(--space-2)]">
                <Button type="submit" disabled={withdraw.isPending}>اسحب</Button>
                <Button type="button" variant="ghost" onClick={() => setWithdrawing(null)}>
                  إلغاء
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-[var(--space-3)] flex gap-[var(--space-2)]">
              <Button variant="ghost" onClick={() => setWithdrawing({ id: bank.id, amount: '' })}>
                سحب
              </Button>

              <Button
                variant="danger"
                disabled={!bank.can_be_deleted}
                title={bank.can_be_deleted ? undefined : 'فيها رصيد. اسحبه أولًا.'}
                onClick={() => remove.mutate(bank.id)}
              >
                حذف
              </Button>
            </div>
          )}
        </Card>
      ))}

      <Card>
        <h2 className="mb-[var(--space-3)] font-semibold">حصالة جديدة</h2>

        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate(
              {
                name: draft.name,
                monthly_contribution: draft.monthly_contribution,
                ...(draft.target_amount === '' ? {} : { target_amount: draft.target_amount }),
              } as never,
              { onSuccess: () => setDraft({ name: '', monthly_contribution: '', target_amount: '' }) },
            )
          }}
        >
          <Field label="الاسم">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </Field>

          <Field label="المساهمة الشهرية" hint="تُضاف عند بدء كل رحلة، وتُخصم من رصيدها">
            <MoneyInput
              value={draft.monthly_contribution}
              onChange={(e) => setDraft({ ...draft, monthly_contribution: e.target.value })}
              required
            />
          </Field>

          <Field label="الهدف" hint="اختياري">
            <MoneyInput
              value={draft.target_amount}
              onChange={(e) => setDraft({ ...draft, target_amount: e.target.value })}
            />
          </Field>

          <Button type="submit" disabled={save.isPending}>أضف</Button>
        </form>
      </Card>
    </div>
  )
}
