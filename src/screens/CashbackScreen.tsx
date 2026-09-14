import { useMemo, useState } from 'react'
import { useCashbackCatalog, useCashbackMappings, useCashbackSpend, useLinkCard, useUpdateMapping } from '@/api/hooks/useCashback'
import { useCards } from '@/api/hooks/useLedger'
import { useConsentText, usePrivacy, useSetConsent } from '@/api/hooks/usePrivacy'
import type { CashbackCatalog, CashbackSpend, UserCard } from '@/api/types'
import { Button, Card, EmptyState, Field, Notice, Select } from '@/components/ui/Primitives'
import { formatEngineAmount, formatMoney } from '@/lib/money'
import {
  engineCards,
  isCompleteSelection,
  monthlySelectionOf,
  rankForSpend,
  selectionComparison,
} from '@/lib/cashback'
import { computeCard } from '@/vendor/cashback-engine'
import type { Card as EngineCard, CategoryId, Spend } from '@/vendor/cashback-engine'

/**
 * بطاقتك مقابل صرفك.
 *
 * **الحساب في متصفحك، وصرفك لا يغادر.** الخادم يعطي بيانات البطاقات المنشورة
 * وملف صرفك الشهري، والمحرك يحسب هنا — 0005 §١٣.٢.
 *
 * وما يفرض العقد ظهوره في الشاشة لا في السياسة وحدها
 * (`contracts/consent-and-transparency.md`):
 *
 * - **شارة مصدر البيانات** بتاريخها
 * - **شارة التقادم** بعد أسبوع **مع سبب التعذّر**
 * - **تنويه بجانب كل نتيجة**: تقديري، ليس عرضًا ولا استشارة
 * - **الفئات المربوطة ظاهرة**، وفكّها متاح
 */

const DISCLAIMER = 'تقديري ومبني على شروط منشورة — ليس عرضًا ولا استشارة مالية.'

const FAILURE_REASON: Record<string, string> = {
  schema_invalid: 'وصلت بيانات لا تطابق العقد فلم نعتمدها',
  rate_limited: 'منصة البطاقات طلبت التمهّل',
  server_error: 'منصة البطاقات فيها عطل مؤقت',
  unreachable: 'تعذّر الوصول لمنصة البطاقات',
}

const currentMonth = () => new Date().toISOString().slice(0, 7)

const dateOnly = (value: string | null) =>
  value === null ? '—' : new Date(value).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })

export function CashbackScreen() {
  const { data: privacy, isPending } = usePrivacy()
  const granted = privacy?.consents.card_integration?.granted === true

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  if (!granted) return <ConsentGate />

  return <CashbackFeature />
}

/**
 * **الإفصاح قبل التفعيل، بالنص الكامل من العقد** — لا صندوق مؤشَّر مسبقًا، ولا
 * «بمتابعتك فأنت موافق».
 */
function ConsentGate() {
  const { data: text } = useConsentText('card_integration')
  const setConsent = useSetConsent()

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">بطاقتك مقابل صرفك</h1>

      <Card>
        {text === undefined ? (
          <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>
        ) : (
          <>
            <div className="whitespace-pre-wrap leading-relaxed">{text.text}</div>
            <p className="mt-[var(--space-3)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
              لو ما فعّلتها: {text.fallback}
            </p>
            <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-2)]">
              <Button
                disabled={setConsent.isPending}
                onClick={() => setConsent.mutate({ type: 'card_integration', granted: true })}
              >
                فعّل الميزة
              </Button>
              <Button variant="ghost" onClick={() => window.history.back()}>
                مو الحين
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function CashbackFeature() {
  const [month, setMonth] = useState(currentMonth())
  const catalog = useCashbackCatalog(true)
  const spend = useCashbackSpend(true, month)

  const cards = useMemo(() => engineCards(catalog.data?.cards ?? []), [catalog.data])

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">بطاقتك مقابل صرفك</h1>

      {catalog.data !== undefined && <SourceBadges catalog={catalog.data} />}

      <Card>
        <Field label="الشهر" hint="شهر تقويمي لا رحلة راتب: البنك يصفّر السقوف أول الشهر.">
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(event) => setMonth(event.target.value)}
            className="min-h-[var(--touch-min)] w-full rounded-[var(--radius-sm)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] px-[var(--space-3)]"
          />
        </Field>
      </Card>

      {spend.data !== undefined && <Coverage spend={spend.data} />}

      <Mappings />

      {catalog.data?.available === true && spend.data !== undefined && (
        <>
          <Comparison cards={cards} spend={spend.data.spend} />
          <MyCards cards={cards} catalog={catalog.data} month={month} spend={spend.data.spend} />
        </>
      )}
    </div>
  )
}

/** شارتا المصدر والتقادم — إلزاميتان بالعقد. */
function SourceBadges({ catalog }: { catalog: CashbackCatalog }) {
  if (!catalog.available) {
    return (
      <Notice tone="warning">
        ما وصلتنا بيانات البطاقات بعد. تُجلب يوميًّا من منصة البطاقات
        {catalog.last_failure !== null && ` — آخر محاولة: ${FAILURE_REASON[catalog.last_failure] ?? 'تعذّرت'}`}.
      </Notice>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
        بيانات البطاقات بتاريخ {dateOnly(catalog.fetched_at)} · من منصة البطاقات · معلومات عامة لا تخصك
      </p>

      {catalog.is_stale && (
        <Notice tone="warning">
          بيانات البطاقات أقدم من أسبوع
          {catalog.last_failure !== null ? ` — ${FAILURE_REASON[catalog.last_failure] ?? 'تعذّر التحديث'}` : ''}. النتائج
          مبنية على آخر نسخة صالحة، وقد تكون الشروط تغيّرت.
        </Notice>
      )}
    </div>
  )
}

/** مؤشر التغطية — «يرى المستخدم ذلك صراحةً لا صامتًا». */
function Coverage({ spend }: { spend: CashbackSpend }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-[var(--space-2)]">
        <span className="font-semibold">صرفك هذا الشهر</span>
        <span>{formatMoney(spend.total)} ر.س</span>
      </div>

      <p className="mt-[var(--space-2)] text-[length:var(--text-caption)]">
        مصنَّف منه {spend.coverage_percent}٪. غير المصنَّف يُحسب «مشتريات أخرى محلية»، وقد تكون نسبته عندك أعلى
        أو أقل.
      </p>

      {spend.unmapped_budgets.length > 0 && (
        <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-state-warning)]">
          ميزانيات بلا فئة: {spend.unmapped_budgets.map((budget) => budget.name).join('، ')}
        </p>
      )}

      {spend.transaction_count === 0 && (
        <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          ما فيه مصروفات في هذا الشهر.
        </p>
      )}
    </Card>
  )
}

/**
 * ميزانياتك مقابل الفئات التسع.
 *
 * **الاقتراح يُعرض ولا يُطبَّق** — «اعتمده» ضغطة منك. والميزانية تبقى باسمك،
 * والفئة علامة تحتها (0005 §١٣.٣).
 */
function Mappings() {
  const { data } = useCashbackMappings(true)
  const update = useUpdateMapping()
  const [open, setOpen] = useState(false)

  if (data === undefined) return null

  const labelOf = (key: string | null) => data.categories.find((category) => category.key === key)?.label_ar ?? key
  const mappedCount = data.budgets.filter((budget) => budget.canonical_category !== null).length

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[var(--touch-min)] w-full items-center justify-between text-start"
        aria-expanded={open}
      >
        <span className="font-semibold">ربط ميزانياتك بالفئات</span>
        <span className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          {mappedCount} من {data.budgets.length}
        </span>
      </button>

      {open && (
        <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
          {data.budgets.length === 0 && <EmptyState title="ما عندك ميزانيات. أنشئ ميزانية لتربطها بفئة." />}

          {data.budgets.map((budget) => (
            <div key={budget.budget_id} className="flex flex-col gap-[var(--space-1)]">
              <Field label={budget.name}>
                <Select
                  value={budget.canonical_category ?? ''}
                  onChange={(event) =>
                    update.mutate({ budgetId: budget.budget_id, category: event.target.value === '' ? null : event.target.value })
                  }
                >
                  <option value="">بلا ربط</option>
                  {data.categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label_ar}
                    </option>
                  ))}
                </Select>
              </Field>

              {budget.canonical_category === null && budget.suggestion !== null && (
                <button
                  type="button"
                  className="min-h-[var(--touch-min)] self-start text-[length:var(--text-caption)] text-[color:var(--color-brand-primary)] underline"
                  onClick={() => update.mutate({ budgetId: budget.budget_id, category: budget.suggestion })}
                >
                  مقترح: {labelOf(budget.suggestion)} — اعتمده
                </button>
              )}
            </div>
          ))}

          <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
            «المشتريات الدولية» ما نقترحها: هي صفة عملة لا نوع صرف. اربطها بنفسك لو ميزانية كلها من الخارج.
          </p>
        </div>
      )}
    </Card>
  )
}

/** «لو صرفت كل شيء بهذه» — 0005 §١٣.٧: المقارنة أولًا. */
function Comparison({ cards, spend }: { cards: EngineCard[]; spend: Spend }) {
  const ranked = useMemo(() => rankForSpend(cards, spend), [cards, spend])

  return (
    <section className="flex flex-col gap-[var(--space-2)]">
      <h2 className="font-semibold">لو صرفت كل شيء ببطاقة واحدة</h2>

      {ranked.map((result, index) => (
        <Card key={result.card.id}>
          <div className="flex items-baseline justify-between gap-[var(--space-2)]">
            <span className="font-semibold">
              {index + 1}. {result.card.short}
            </span>
            <span>{formatEngineAmount(result.netAnnual)} ر.س سنويًا</span>
          </div>

          <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">{result.card.issuer}</p>

          <dl className="mt-[var(--space-2)] grid grid-cols-2 gap-[var(--space-1)] text-[length:var(--text-caption)]">
            <dt className="text-[color:var(--color-ink-muted)]">كاش باك شهري</dt>
            <dd>{formatEngineAmount(result.finalMonthly)} ر.س</dd>
            <dt className="text-[color:var(--color-ink-muted)]">الرسوم السنوية</dt>
            <dd>{result.feeWaived ? 'معفاة بصرفك' : `${formatEngineAmount(result.effectiveFee)} ر.س`}</dd>
            {result.lostToCaps + result.lostToTotalCap > 0 && (
              <>
                <dt className="text-[color:var(--color-ink-muted)]">ضاع بالسقوف</dt>
                <dd>{formatEngineAmount(result.lostToCaps + result.lostToTotalCap)} ر.س شهريًا</dd>
              </>
            )}
          </dl>

          {result.card.fxUncertain === true && (
            <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-state-warning)]">
              رسوم العمليات الدولية غير مؤكدة من البنك.
            </p>
          )}

          {/* **بجانب كل نتيجة** لا في التذييل وحده — العقد. */}
          <p className="mt-[var(--space-2)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">{DISCLAIMER}</p>
        </Card>
      ))}
    </section>
  )
}

/**
 * بطاقاتك: ربطها بمنتج منشور، والاختيار الشهري، و«كم كسبت فعلًا».
 *
 * **من لا يجد بطاقته يختار أخرى ويُحسب لها** — أداة مقارنة لا سجل ملكية
 * (0005 §١٣.٦).
 */
function MyCards({
  cards,
  catalog,
  month,
  spend,
}: {
  cards: EngineCard[]
  catalog: CashbackCatalog
  month: string
  spend: Spend
}) {
  const { data: userCards } = useCards()

  return (
    <section className="flex flex-col gap-[var(--space-2)]">
      <h2 className="font-semibold">بطاقاتك</h2>

      {(userCards ?? []).length === 0 && (
        <EmptyState title="ما سجّلت بطاقات. أضفها من الإعدادات لتعرف كم كسبت فعلًا من كل واحدة." />
      )}

      {(userCards ?? []).map((userCard) => (
        <MyCard key={userCard.id} userCard={userCard} cards={cards} catalog={catalog} month={month} spend={spend} />
      ))}
    </section>
  )
}

function MyCard({
  userCard,
  cards,
  catalog,
  month,
  spend,
}: {
  userCard: UserCard
  cards: EngineCard[]
  catalog: CashbackCatalog
  month: string
  spend: Spend
}) {
  const link = useLinkCard()
  const linked = cards.find((card) => card.id === userCard.canonical_card_slug) ?? null
  const mechanism = linked === null ? null : monthlySelectionOf(linked)
  const own = useCashbackSpend(linked !== null, month, userCard.id)

  const [order, setOrder] = useState<string[]>(userCard.monthly_selection ?? [])
  const saved = linked !== null && isCompleteSelection(linked, userCard.monthly_selection)

  const labelOf = (key: string) => catalog.categories.find((category) => category.key === key)?.label_ar ?? key

  return (
    <Card>
      <p className="font-semibold">
        {userCard.name}
        {userCard.last_four !== null && ` ••${userCard.last_four}`}
      </p>

      <Field label="أي بطاقة منشورة هي؟" hint="لو ما لقيتها اختر الأقرب، ويُحسب لها.">
        <Select
          value={userCard.canonical_card_slug ?? ''}
          onChange={(event) =>
            link.mutate({ id: userCard.id, slug: event.target.value === '' ? null : event.target.value, selection: null })
          }
        >
          <option value="">بلا ربط</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.issuer} — {card.short}
            </option>
          ))}
        </Select>
      </Field>

      {/* الاختيار الشهري: رقمان — بما اخترت، وبأفضل توزيع (0005 §١٣.٥). */}
      {linked !== null && mechanism !== null && (
        <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-2)]">
          <p className="text-[length:var(--text-caption)]">
            هذي البطاقة تخليك تختار كل شهر أي فئة تأخذ أي نسبة. رتّبها كما اخترتها في تطبيق بنكك:
          </p>

          {mechanism.tierRates.map((rate, index) => (
            <Field key={index} label={`النسبة ${formatEngineAmount(rate * 100)}٪`}>
              <Select
                value={order[index] ?? ''}
                onChange={(event) => {
                  const next = [...order]
                  next[index] = event.target.value
                  setOrder(next)
                }}
              >
                <option value="">اختر…</option>
                {mechanism.selectable.map((category) => (
                  <option key={category} value={category}>
                    {labelOf(category)}
                  </option>
                ))}
              </Select>
            </Field>
          ))}

          <Button
            variant="ghost"
            disabled={!isCompleteSelection(linked, order) || link.isPending}
            onClick={() => link.mutate({ id: userCard.id, slug: linked.id, selection: order })}
          >
            احفظ اختيار الشهر
          </Button>

          {saved && (
            <SelectionNumbers card={linked} spend={spend} order={userCard.monthly_selection as CategoryId[]} />
          )}
        </div>
      )}

      {/* «كم كسبت فعلًا» — العمليات المسندة لهذي البطاقة وحدها. */}
      {linked !== null && own.data !== undefined && (
        <ActualEarned card={linked} spendData={own.data} order={saved ? (userCard.monthly_selection as CategoryId[]) : null} />
      )}
    </Card>
  )
}

function SelectionNumbers({ card, spend, order }: { card: EngineCard; spend: Spend; order: CategoryId[] }) {
  const { best, chosen, lostMonthly } = selectionComparison(card, spend, order)

  return (
    <div className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-[var(--space-3)] text-[length:var(--text-caption)]">
      <p>
        بما اخترت: <strong>{formatEngineAmount(chosen.monthly)} ر.س</strong> شهريًا لو صرفت كل شيء بها
      </p>
      <p>
        بأفضل توزيع لصرفك: <strong>{formatEngineAmount(best.monthly)} ر.س</strong>
      </p>
      {lostMonthly > 0 ? (
        <p className="text-[color:var(--color-state-warning)]">تخسر {formatEngineAmount(lostMonthly)} ر.س شهريًا بتوزيعك الحالي.</p>
      ) : (
        <p className="text-[color:var(--color-state-positive)]">توزيعك هو الأفضل لصرفك.</p>
      )}
      <p className="mt-[var(--space-1)] text-[color:var(--color-ink-muted)]">{DISCLAIMER}</p>
    </div>
  )
}

function ActualEarned({ card, spendData, order }: { card: EngineCard; spendData: CashbackSpend; order: CategoryId[] | null }) {
  const result = order === null ? computeCard(card, spendData.spend) : selectionComparison(card, spendData.spend, order).chosen

  return (
    <div className="mt-[var(--space-3)] text-[length:var(--text-caption)]">
      <p>
        صرفت بها هذا الشهر {formatMoney(spendData.total)} ر.س في {spendData.transaction_count} عملية. كسبت منها
        تقريبًا <strong>{formatEngineAmount(result.monthly)} ر.س</strong>.
      </p>
      {spendData.transaction_count === 0 && (
        <p className="text-[color:var(--color-ink-muted)]">
          ما فيه عمليات مسندة لهذي البطاقة. اختر البطاقة عند إضافة المصروف ليُحسب هنا.
        </p>
      )}
      <p className="mt-[var(--space-1)] text-[color:var(--color-ink-muted)]">{DISCLAIMER}</p>
    </div>
  )
}
