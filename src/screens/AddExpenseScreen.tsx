import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgets, useCommitments, usePiggyBanks } from '@/api/hooks/useMoneyResources'
import { useCards, useSaveTransaction, useTags } from '@/api/hooks/useLedger'
import { useDraftSync } from '@/lib/offline/useDraftSync'
import { ApiError } from '@/api/client'
import { Button, Card, Field, Input, MoneyInput, Notice, Select } from '@/components/ui/Primitives'

/**
 * إضافة مصروف — **فورم المراجعة الموحّد**.
 *
 * القسم ٥.٥: كل مسارات الإدخال الثلاثة تنتهي هنا قبل الحفظ. ولا حفظ مباشر
 * من مصدر آلي بلا تأكيد المستخدم.
 *
 * وثلاث قواعد مرئية في هذه الشاشة:
 * - **البطاقة اختيارية دائمًا** ولا تمنع الحفظ.
 * - **الوسوم لا تُورَّث من الميزانية** — تُختار هنا صراحةً.
 * - بلا إنترنت تُحفظ **مسودة** لا تدخل في أي رقم حتى تُزامَن.
 */
export function AddExpenseScreen() {
  const navigate = useNavigate()
  const save = useSaveTransaction()
  const { drafts, discard } = useDraftSync()

  const { data: budgetData } = useBudgets()
  const { data: commitments } = useCommitments()
  const { data: piggyBanks } = usePiggyBanks()
  const { data: cards } = useCards()
  const { data: tags } = useTags('transaction')

  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10))
  const [categoryType, setCategoryType] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [cardId, setCardId] = useState('')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const error = save.error instanceof ApiError ? save.error : null
  const failedDrafts = drafts.filter((draft) => draft.lastError !== undefined)

  // الميزانيات المعطّلة تُعرض للقراءة ولا تقبل مصروفًا جديدًا — القرار 12.9.
  const openBudgets = (budgetData?.budgets ?? []).filter((b) => b.accepts_new_expenses)

  const categoryOptions =
    categoryType === 'budget'
      ? openBudgets.map((b) => ({ id: b.id, name: b.name }))
      : categoryType === 'commitment'
        ? (commitments ?? []).map((c) => ({ id: c.id, name: c.name }))
        : categoryType === 'piggybank'
          ? (piggyBanks ?? []).map((p) => ({ id: p.id, name: p.name }))
          : []

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">إضافة مصروف</h1>

      {failedDrafts.length > 0 && (
        <Notice tone="danger">
          <p className="mb-[var(--space-2)]">مسودات لم تُحفظ:</p>
          <ul className="flex flex-col gap-[var(--space-1)]">
            {failedDrafts.map((draft) => (
              <li key={draft.localId} className="flex items-center justify-between gap-[var(--space-2)]">
                <span>{draft.lastError}</span>
                <button type="button" onClick={() => discard(draft.localId)} className="underline">
                  احذفها
                </button>
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {notice !== null && <Notice tone="positive">{notice}</Notice>}

      <Card>
        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()

            save.mutate(
              {
                type: 'expense',
                amount,
                merchant_name: merchant,
                spent_at: spentAt,
                input_method: 'manual',
                ...(categoryType === '' ? {} : { category_type: categoryType, category_id: Number(categoryId) }),
                ...(cardId === '' ? {} : { user_card_id: Number(cardId) }),
                ...(selectedTags.length === 0 ? {} : { tags: selectedTags }),
              },
              {
                onSuccess: (result) => {
                  setAmount('')
                  setMerchant('')
                  setSelectedTags([])

                  setNotice(
                    result.queued
                      ? 'حُفظت مسودة. ما دخلت في أي رقم، وتُرفع أول ما ترجع الشبكة.'
                      : (result.message ?? 'حُفظت العملية.'),
                  )
                },
              },
            )
          }}
        >
          <Field label="المبلغ" error={error?.fieldError('amount')}>
            <MoneyInput
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </Field>

          <Field label="التاجر" error={error?.fieldError('merchant_name')}>
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} required />
          </Field>

          <Field label="تاريخ الصرف" hint="لو تركته فهو اليوم">
            <Input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
          </Field>

          <Field label="على أي باب؟" hint="اختياري">
            <Select
              value={categoryType}
              onChange={(e) => {
                setCategoryType(e.target.value)
                setCategoryId('')
              }}
            >
              <option value="">بلا تصنيف</option>
              <option value="budget">ميزانية</option>
              <option value="commitment">التزام شهري</option>
              <option value="piggybank">حصالة</option>
            </Select>
          </Field>

          {categoryType !== '' && (
            <Field label="أي واحدة؟" error={error?.fieldError('category_id')}>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">اختر…</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {/* **اختيارية دائمًا** — لا تمنع حفظ العملية. القاعدة السادسة. */}
          <Field label="البطاقة" hint="اختيارية — العملية تُحفظ بدونها">
            <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">بلا بطاقة</option>
              {(cards ?? []).map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                  {card.last_four === null ? '' : ` ••${card.last_four}`}
                </option>
              ))}
            </Select>
          </Field>

          {(tags ?? []).length > 0 && (
            <Field label="الوسوم" hint="تُختار هنا صراحةً — لا تُورَث من الميزانية">
              <div className="flex flex-wrap gap-[var(--space-2)]">
                {(tags ?? []).map((tag) => {
                  const active = selectedTags.includes(tag.id)

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSelectedTags((current) =>
                          active ? current.filter((id) => id !== tag.id) : [...current, tag.id],
                        )
                      }
                      className={`min-h-[var(--touch-min)] rounded-[var(--radius-full)] border px-[var(--space-3)] text-[length:var(--text-caption)] ${
                        active
                          ? 'border-[color:var(--color-brand-primary)] bg-[color:var(--color-brand-primary)] text-[color:var(--color-ink-inverse)]'
                          : 'border-[color:var(--color-surface-border)] text-[color:var(--color-ink-base)]'
                      }`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {error !== null && !error.isValidation && <Notice tone="danger">{error.message}</Notice>}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'يحفظ…' : navigator.onLine ? 'احفظ' : 'احفظ كمسودة'}
          </Button>

          <Button type="button" variant="ghost" onClick={() => navigate('/')}>
            رجوع
          </Button>
        </form>
      </Card>
    </div>
  )
}
