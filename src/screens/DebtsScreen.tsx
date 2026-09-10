import { useState } from 'react'
import {
  useDebts,
  useDeleteDebt,
  useDeleteDebtPayment,
  useSaveDebt,
  useSaveDebtPayment,
  useShareMessage,
} from '@/api/hooks/useLedger'
import { Money } from '@/components/ui/Money'
import { Button, Card, EmptyState, Field, Input, MoneyInput, Notice, Select } from '@/components/ui/Primitives'
import { ApiError } from '@/api/client'

/**
 * الديون — **دفتر مستقل خارج رصيد الرحلة**.
 *
 * الدين نقل ملكية لا صرف، فلا دفعة تُنشئ عملية ولا تمس رصيدًا. ودفعة تفيض
 * عن المتبقي تُرفض مع ذكره، ويبقى للمستخدم أن يكتب ما حدث في ملاحظة الدين
 * أو الدفعة.
 */
function ShareBlock({ debtId }: { debtId: number }) {
  const [open, setOpen] = useState(false)
  const { data } = useShareMessage(debtId, open)

  return (
    <div className="mt-[var(--space-2)]">
      <Button variant="ghost" onClick={() => setOpen((value) => !value)}>
        {open ? 'إخفاء نص المشاركة' : 'نص للمشاركة'}
      </Button>

      {open && data !== undefined && (
        <div className="mt-[var(--space-2)]">
          <textarea
            readOnly
            value={data.message}
            rows={5}
            className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-sunken)] p-[var(--space-3)]"
          />
          <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
            النص يخص هذا الدين وحده. **ما فيه راتبك ولا رصيدك ولا بقية ديونك.**
          </p>
        </div>
      )}
    </div>
  )
}

export function DebtsScreen() {
  const { data, isPending } = useDebts()
  const saveDebt = useSaveDebt()
  const savePayment = useSaveDebtPayment()
  const removePayment = useDeleteDebtPayment()
  const removeDebt = useDeleteDebt()

  const [draft, setDraft] = useState({
    type: 'owed_by_me',
    counterparty_name: '',
    original_amount: '',
    note: '',
  })
  const [paying, setPaying] = useState<{ debtId: number; amount: string; note: string } | null>(null)

  const error = (savePayment.error ?? saveDebt.error) instanceof ApiError
    ? ((savePayment.error ?? saveDebt.error) as ApiError)
    : null

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">الديون</h1>

      <Notice tone="info">
        الديون دفتر مستقل: **لا تدخل في رصيد رحلتك ولا في مصروفاتك.**
      </Notice>

      {error !== null && <Notice tone="danger">{error.message}</Notice>}

      {(data ?? []).length === 0 && <EmptyState title="ما عندك ديون مسجَّلة." />}

      {(data ?? []).map((debt) => (
        <Card key={debt.id}>
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p>{debt.counterparty_name}</p>
              <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                {debt.type === 'owed_by_me' ? 'عليك' : 'لك'} ·{' '}
                {debt.status === 'settled' ? 'مسدَّد' : 'مفتوح'}
              </p>
            </div>

            <div className="text-end">
              <Money amount={debt.remaining_amount} sensitive size="title" />
              <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                من <Money amount={debt.original_amount} />
              </p>
            </div>
          </div>

          {debt.note !== null && debt.note !== '' && (
            <p className="mt-[var(--space-2)] rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-[var(--space-2)] text-[length:var(--text-caption)]">
              {debt.note}
            </p>
          )}

          {(debt.payments ?? []).length > 0 && (
            <ul className="mt-[var(--space-3)] flex flex-col gap-[var(--space-1)] text-[length:var(--text-caption)]">
              {(debt.payments ?? []).map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-[var(--space-2)]">
                  <span>
                    {payment.paid_at} · <Money amount={payment.amount} />
                    {payment.note !== null && payment.note !== '' && ` · ${payment.note}`}
                  </span>
                  <button
                    type="button"
                    className="text-[color:var(--color-state-danger)]"
                    onClick={() => removePayment.mutate({ debtId: debt.id, paymentId: payment.id })}
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}

          {paying?.debtId === debt.id ? (
            <form
              className="mt-[var(--space-3)] flex flex-col gap-[var(--space-2)]"
              onSubmit={(event) => {
                event.preventDefault()
                savePayment.mutate(
                  {
                    debtId: debt.id,
                    amount: paying.amount,
                    paid_at: new Date().toISOString().slice(0, 10),
                    note: paying.note === '' ? null : paying.note,
                  },
                  { onSuccess: () => setPaying(null) },
                )
              }}
            >
              <Field label="مبلغ الدفعة" hint={`المتبقي ${debt.remaining_amount}`}>
                <MoneyInput
                  value={paying.amount}
                  onChange={(e) => setPaying({ ...paying, amount: e.target.value })}
                  autoFocus
                  required
                />
              </Field>

              <Field label="ملاحظة" hint="اختيارية">
                <Input
                  value={paying.note}
                  onChange={(e) => setPaying({ ...paying, note: e.target.value })}
                />
              </Field>

              <div className="flex gap-[var(--space-2)]">
                <Button type="submit" disabled={savePayment.isPending}>سجّل</Button>
                <Button type="button" variant="ghost" onClick={() => setPaying(null)}>إلغاء</Button>
              </div>
            </form>
          ) : (
            <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
              {debt.status === 'open' && (
                <Button
                  variant="ghost"
                  onClick={() => setPaying({ debtId: debt.id, amount: '', note: '' })}
                >
                  سجّل دفعة
                </Button>
              )}
              <Button variant="danger" onClick={() => removeDebt.mutate(debt.id)}>حذف</Button>
            </div>
          )}

          <ShareBlock debtId={debt.id} />
        </Card>
      ))}

      <Card>
        <h2 className="mb-[var(--space-3)] font-semibold">دين جديد</h2>

        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()
            saveDebt.mutate(
              { ...draft, note: draft.note === '' ? null : draft.note } as never,
              {
                onSuccess: () =>
                  setDraft({ type: 'owed_by_me', counterparty_name: '', original_amount: '', note: '' }),
              },
            )
          }}
        >
          <Field label="النوع">
            <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <option value="owed_by_me">دين عليّ</option>
              <option value="owed_to_me">دين لي</option>
            </Select>
          </Field>

          <Field label="الطرف المقابل">
            <Input
              value={draft.counterparty_name}
              onChange={(e) => setDraft({ ...draft, counterparty_name: e.target.value })}
              required
            />
          </Field>

          <Field label="المبلغ">
            <MoneyInput
              value={draft.original_amount}
              onChange={(e) => setDraft({ ...draft, original_amount: e.target.value })}
              required
            />
          </Field>

          <Field label="ملاحظة" hint="اختيارية — سببه أو اتفاق عليه">
            <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </Field>

          <Button type="submit" disabled={saveDebt.isPending}>أضف</Button>
        </form>
      </Card>
    </div>
  )
}
