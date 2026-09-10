import { useState } from 'react'
import {
  useCommitments,
  useDeleteCommitment,
  useMarkCommitmentPaid,
  useSaveCommitment,
} from '@/api/hooks/useMoneyResources'
import { Money } from '@/components/ui/Money'
import { Button, Card, EmptyState, Field, Input, MoneyInput, Notice } from '@/components/ui/Primitives'

/**
 * الالتزامات الشهرية.
 *
 * القرار 12.7: **تعليم السداد لا يُنشئ عملية.** ومن سجّل مصروفًا وأسنده
 * لالتزام، عُلّم الالتزام تلقائيًا.
 */
export function CommitmentsScreen() {
  const { data, isPending } = useCommitments()
  const save = useSaveCommitment()
  const markPaid = useMarkCommitmentPaid()
  const remove = useDeleteCommitment()

  const [draft, setDraft] = useState({ name: '', amount: '', due_day: '1' })

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">الالتزامات الشهرية</h1>

      <Notice tone="info">
        تعليم السداد يسجّل أنه دُفع فقط، **ولا ينشئ مصروفًا** بمبلغ مفترض. لو تبي يظهر في
        مصروفاتك، سجّله من شاشة الإضافة وأسنده لهذا الالتزام.
      </Notice>

      {(data ?? []).length === 0 && <EmptyState title="ما عندك التزامات بعد." />}

      {(data ?? []).map((commitment) => (
        <Card key={commitment.id}>
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p>{commitment.name}</p>
              <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                يوم {commitment.due_day_this_month} من الشهر
                {commitment.due_day > 28 && ' · يُضبط على آخر يوم في الأشهر الأقصر'}
              </p>
            </div>
            <Money amount={commitment.amount} />
          </div>

          <div className="mt-[var(--space-3)] flex gap-[var(--space-2)]">
            <Button
              variant={commitment.is_paid_current_cycle ? 'ghost' : 'primary'}
              onClick={() =>
                markPaid.mutate({ id: commitment.id, paid: !commitment.is_paid_current_cycle })
              }
            >
              {commitment.is_paid_current_cycle ? 'ألغِ علامة السداد' : 'علّمه مسدَّدًا'}
            </Button>

            <Button variant="danger" onClick={() => remove.mutate(commitment.id)}>
              حذف
            </Button>
          </div>
        </Card>
      ))}

      <Card>
        <h2 className="mb-[var(--space-3)] font-semibold">التزام جديد</h2>

        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate({ ...draft, due_day: Number(draft.due_day) } as never, {
              onSuccess: () => setDraft({ name: '', amount: '', due_day: '1' }),
            })
          }}
        >
          <Field label="الاسم">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </Field>

          <Field label="المبلغ">
            <MoneyInput
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              required
            />
          </Field>

          <Field label="يوم الاستحقاق" hint="من ١ إلى ٣١">
            <Input
              type="number"
              min={1}
              max={31}
              value={draft.due_day}
              onChange={(e) => setDraft({ ...draft, due_day: e.target.value })}
              required
            />
          </Field>

          <Button type="submit" disabled={save.isPending}>أضف</Button>
        </form>
      </Card>
    </div>
  )
}
