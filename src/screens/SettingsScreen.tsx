import { Link } from 'react-router-dom'
import { useMe } from '@/api/hooks/useAuth'
import { useCards, useDeleteCard, useSaveCard, useTags } from '@/api/hooks/useLedger'
import { useState } from 'react'
import { Button, Card, Field, Input, Notice } from '@/components/ui/Primitives'
import { ApiError } from '@/api/client'

const links = [
  { to: '/cycles', label: 'رحلات الرواتب' },
  { to: '/commitments', label: 'الالتزامات الشهرية' },
  { to: '/piggy-banks', label: 'الحصالات' },
  { to: '/funds', label: 'الاستثمار والطوارئ' },
  { to: '/debts', label: 'الديون' },
  { to: '/audit', label: 'السجل' },
  { to: '/contact', label: 'تواصل معنا' },
]

/**
 * الإعدادات.
 *
 * **بطاقاتك: آخر أربعة أرقام فقط.** لا رقم كامل ولا CVV ولا تاريخ انتهاء
 * ولا اسم حامل — القاعدة السادسة، والخادم يرفض هذي الحقول صراحةً.
 */
export function SettingsScreen() {
  const { data: user } = useMe()
  const { data: cards } = useCards()
  const { data: tags } = useTags()
  const saveCard = useSaveCard()
  const removeCard = useDeleteCard()

  const [draft, setDraft] = useState({ name: '', bank_name: '', last_four: '', nickname: '' })

  const error = saveCard.error instanceof ApiError ? saveCard.error : null

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">الإعدادات</h1>

      <Card>
        <p>{user?.name}</p>
        <p dir="ltr" className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          {user?.email}
        </p>
      </Card>

      <nav className="flex flex-col gap-[var(--space-2)]">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex min-h-[var(--touch-min)] items-center rounded-[var(--radius-md)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] px-[var(--space-4)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <section className="flex flex-col gap-[var(--space-2)]">
        <h2 className="font-semibold">بطاقاتي</h2>

        <Notice tone="info">
          نحفظ **آخر أربعة أرقام فقط**. لا رقم بطاقة كامل، ولا رمز تحقق، ولا تاريخ انتهاء، ولا
          اسم حامل. ونسبة العملية لبطاقة اختيارية دائمًا.
        </Notice>

        {(cards ?? []).map((card) => (
          <Card key={card.id}>
            <div className="flex items-center justify-between gap-[var(--space-3)]">
              <div>
                <p>{card.name}</p>
                <p
                  dir="ltr"
                  className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]"
                >
                  {card.bank_name}
                  {card.last_four === null ? '' : ` •••• ${card.last_four}`}
                </p>
              </div>
              <Button variant="danger" onClick={() => removeCard.mutate(card.id)}>
                حذف
              </Button>
            </div>
          </Card>
        ))}

        <Card>
          <form
            className="flex flex-col gap-[var(--space-3)]"
            onSubmit={(event) => {
              event.preventDefault()
              saveCard.mutate(
                {
                  name: draft.name,
                  bank_name: draft.bank_name,
                  last_four: draft.last_four === '' ? null : draft.last_four,
                  nickname: draft.nickname === '' ? null : draft.nickname,
                } as never,
                { onSuccess: () => setDraft({ name: '', bank_name: '', last_four: '', nickname: '' }) },
              )
            }}
          >
            <Field label="اسم البطاقة" hint="كما تعرفها أنت">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </Field>

            <Field label="البنك">
              <Input
                value={draft.bank_name}
                onChange={(e) => setDraft({ ...draft, bank_name: e.target.value })}
                required
              />
            </Field>

            <Field label="آخر أربعة أرقام" hint="اختيارية" error={error?.fieldError('last_four')}>
              <Input
                inputMode="numeric"
                dir="ltr"
                maxLength={4}
                value={draft.last_four}
                onChange={(e) => setDraft({ ...draft, last_four: e.target.value.replace(/\D/g, '') })}
              />
            </Field>

            <Field label="اسم مستعار" hint="اختياري — «بطاقة الراتب»">
              <Input
                value={draft.nickname}
                onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
              />
            </Field>

            {error !== null && !error.isValidation && <Notice tone="danger">{error.message}</Notice>}

            <Button type="submit" disabled={saveCard.isPending}>أضف بطاقة</Button>
          </form>
        </Card>
      </section>

      <section className="flex flex-col gap-[var(--space-2)]">
        <h2 className="font-semibold">الوسوم</h2>
        <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          الوسم تصنيف عرضي **لا يغيّر أي رقم مالي**. وعملية داخل ميزانية موسومة لا ترث وسومها —
          تختارها أنت.
        </p>

        <div className="flex flex-wrap gap-[var(--space-2)]">
          {(tags ?? []).map((tag) => (
            <span
              key={tag.id}
              className="rounded-[var(--radius-full)] border border-[color:var(--color-surface-border)] px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-caption)]"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
