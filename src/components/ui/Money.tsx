import { formatMoney, isNegative } from '@/lib/money'
import { usePrivacy } from '@/context/PrivacyContext'

interface MoneyProps {
  amount: string
  /** الأرقام الحسّاسة تُطمس بزر العين: الراتب والفائض والمتبقي والإجمالي. */
  sensitive?: boolean
  size?: 'body' | 'title' | 'display' | 'figure'
  tone?: 'default' | 'muted' | 'positive' | 'danger'
}

const sizeClass = {
  body: 'text-[length:var(--text-body)]',
  title: 'text-[length:var(--text-title)]',
  display: 'text-[length:var(--text-display)]',
  figure: 'text-[length:var(--text-figure)]',
} as const

const toneClass = {
  default: 'text-[color:var(--color-ink-strong)]',
  muted: 'text-[color:var(--color-ink-muted)]',
  positive: 'text-[color:var(--color-state-positive)]',
  danger: 'text-[color:var(--color-state-danger)]',
} as const

/**
 * عرض مبلغ.
 *
 * **يستقبل نصًّا ولا يحوّله إلى رقم إلا عند التنسيق النهائي.** المبلغ يصل
 * من الخلفية `"3825.00"`، و`parseFloat` عليه يعيد خطأ الفاصلة العائمة الذي
 * حُذف من الخلفية كلها.
 */
export function Money({ amount, sensitive = false, size = 'body', tone = 'default' }: MoneyProps) {
  const { hidden } = usePrivacy()
  const negative = isNegative(amount)

  const resolvedTone = tone === 'default' && negative ? 'danger' : tone

  if (sensitive && hidden) {
    return (
      <span
        className={`${sizeClass[size]} tabular-nums tracking-widest text-[color:var(--color-ink-muted)]`}
        aria-label="مبلغ مخفي"
      >
        ••••
      </span>
    )
  }

  return (
    <span className={`${sizeClass[size]} ${toneClass[resolvedTone]} tabular-nums`}>
      {formatMoney(amount)}
      <span className="ms-1 text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
        ريال
      </span>
    </span>
  )
}
