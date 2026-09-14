import { CATEGORIES, computeCard, rankCards } from '@/vendor/cashback-engine'
import type {
  Card,
  CardResult,
  CategoryId,
  MonthlySelectionMechanism,
  PerkOptions,
  RankedCard,
  RateConfig,
  Spend,
} from '@/vendor/cashback-engine'
import { toEngineCards, type ContractCard } from '@/vendor/card-adapter'

/**
 * طبقة فوق المحرك المنسوخ — **لا تعدّله ولا تعيد حسابًا يحسبه**.
 *
 * المحرك يعمل هنا في المتصفح على ملف صرف أعدّه الخادم. **لا يغادر الصرف**.
 */

/** المزايا خارج الحساب: قيمة صالة المطار تقدير شخصي لا رقم منشور. */
export const NO_PERKS: PerkOptions = { on: false }

export function engineCards(cards: ContractCard[]): Card[] {
  return toEngineCards({ schemaVersion: '', generatedAt: '', categories: [], cards })
}

/**
 * «لو صرفت كل شيء بهذه» — كل البطاقات مرتّبة بصافيها السنوي.
 *
 * الرسوم الدولية داخل الحساب حين في الملف صرف دولي: إخفاؤها يرفع البطاقة ذات
 * الرسوم العالية فوق ما تستحق.
 */
export function rankForSpend(cards: Card[], spend: Spend): RankedCard[] {
  return rankCards(cards, spend, (spend.intl ?? 0) > 0, NO_PERKS)
}

export function monthlySelectionOf(card: Card): MonthlySelectionMechanism | null {
  const found = (card.mechanisms ?? []).find((mechanism) => mechanism.type === 'monthly_selection')

  return (found as MonthlySelectionMechanism | undefined) ?? null
}

/**
 * البطاقة نفسها **بتوزيع يختاره المستخدم** بدل الأفضل.
 *
 * ## لماذا تحويلٌ لا تعديلٌ للمحرك
 *
 * آلية الاختيار الشهري تجرّب كل التوزيعات وتختار الأعلى عائدًا بنفسها، ولا
 * تقبل توزيعًا من الخارج. والمحرك لا يُعدَّل — `0003`: أي تغيير في ناتجه
 * كاسر. فالتوزيع المختار يُكتب **نسبًا ثابتة** في البطاقة وتُزال الآلية، بنفس
 * ما تكتبه الآلية حين تختار.
 *
 * **وتكرار منطق الآلية هنا خطر تباعد**، فيحرسه اختبار: التحويل بالتوزيع الذي
 * اختاره المحرك نفسه يجب أن يعطي **الرقم نفسه تمامًا**.
 *
 * `order[i]` هي الفئة التي تأخذ `tierRates[i]`.
 */
export function withFixedSelection(card: Card, order: CategoryId[]): Card {
  const mechanism = monthlySelectionOf(card)

  if (mechanism === null) return card

  const rates = {} as Record<CategoryId, RateConfig>

  for (const category of CATEGORIES) {
    const source = card.rates[category.id] ?? {}

    rates[category.id] = {
      ...source,
      // كما تفعل الآلية: كل نسبة لم تُحدَّد تأخذ الأساس.
      rate: source.rate == null ? mechanism.baseRate : source.rate,
    }
  }

  order.forEach((category, index) => {
    rates[category] = { ...rates[category], rate: mechanism.tierRates[index], cap: mechanism.tierCap, capGroup: category }
  })

  for (const [from, to] of Object.entries(mechanism.follows ?? {}) as [CategoryId, CategoryId][]) {
    rates[from] = { ...rates[from], rate: rates[to].rate, cap: mechanism.tierCap, capGroup: to }
  }

  return {
    ...card,
    rates,
    mechanisms: (card.mechanisms ?? []).filter((item) => item.type !== 'monthly_selection'),
  }
}

/**
 * الرقمان لبطاقات الاختيار الشهري — 0005 §١٣.٥.
 *
 * بما اختار، وبأفضل توزيع. **والفرق هو ما يخسره بعدم التحسين.** ويُعاد الفرق
 * من المحرك لا بطرح عددين هنا — كلاهما ناتج `computeCard`، والطرح للعرض وحده.
 */
export function selectionComparison(card: Card, spend: Spend, order: CategoryId[]) {
  const best: CardResult = computeCard(card, spend)
  const chosen: CardResult = computeCard(withFixedSelection(card, order), spend)

  return { best, chosen, lostMonthly: Math.max(0, best.monthly - chosen.monthly) }
}

/** هل التوزيع المحفوظ صالح لهذه البطاقة؟ كل فئات الاختيار، كلٌّ مرة واحدة. */
export function isCompleteSelection(card: Card, order: string[] | null | undefined): order is CategoryId[] {
  const mechanism = monthlySelectionOf(card)

  if (mechanism === null || !order) return false

  return (
    order.length === mechanism.tierRates.length &&
    new Set(order).size === order.length &&
    order.every((category) => mechanism.selectable.includes(category as CategoryId))
  )
}
