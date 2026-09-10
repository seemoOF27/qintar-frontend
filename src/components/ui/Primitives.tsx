import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

/**
 * العناصر الأساسية.
 *
 * **الجوال أولًا:** كل هدف لمس لا يقل عن `--touch-min`، وكل حقل لا يقل خطه
 * عن 16px وإلا كبّره iOS تلقائيًا عند التركيز فتقفز الشاشة.
 *
 * **ولا Hex مباشر:** كل لون عبر متغير من `shared/design-tokens.json`.
 */

const touch = 'min-h-[var(--touch-min)]'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary:
      'bg-[color:var(--color-brand-primary)] text-[color:var(--color-ink-inverse)] hover:bg-[color:var(--color-brand-primaryMuted)]',
    ghost:
      'bg-transparent text-[color:var(--color-ink-base)] border border-[color:var(--color-surface-border)] hover:bg-[color:var(--color-surface-sunken)]',
    danger:
      'bg-transparent text-[color:var(--color-state-danger)] border border-[color:var(--color-state-danger)]',
  }[variant]

  return (
    <button
      {...props}
      className={`${touch} ${styles} inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-[var(--space-4)] font-medium transition-colors disabled:opacity-50 ${className}`}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-[var(--space-1)]">
      <span className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
        {label}
      </span>
      {children}
      {hint !== undefined && error === undefined && (
        <span className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          {hint}
        </span>
      )}
      {error !== undefined && (
        <span
          role="alert"
          className="text-[length:var(--text-caption)] text-[color:var(--color-state-danger)]"
        >
          {error}
        </span>
      )}
    </label>
  )
}

const controlClass = `${touch} w-full rounded-[var(--radius-md)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] px-[var(--space-3)] text-[color:var(--color-ink-strong)] outline-none focus:border-[color:var(--color-brand-primary)]`

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${className}`} />
}

/**
 * حقل مبلغ.
 *
 * `inputMode="decimal"` يفتح لوحة الأرقام على الجوال، و`type="text"` مقصود:
 * `type="number"` يسمح للمتصفح بتحويل القيمة إلى رقم فيفقد الدقة.
 */
export function MoneyInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      dir="ltr"
      className={`${controlClass} text-end tabular-nums ${className}`}
    />
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${className}`} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] p-[var(--space-4)] shadow-[var(--shadow-raised)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'positive'
  children: ReactNode
}) {
  const color = {
    info: 'var(--color-state-info)',
    warning: 'var(--color-state-warning)',
    danger: 'var(--color-state-danger)',
    positive: 'var(--color-state-positive)',
  }[tone]

  return (
    <div
      role="status"
      className="rounded-[var(--radius-md)] border-s-4 bg-[color:var(--color-surface-sunken)] p-[var(--space-3)] text-[length:var(--text-caption)]"
      style={{ borderInlineStartColor: color }}
    >
      {children}
    </div>
  )
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-[var(--space-3)] p-[var(--space-6)] text-center text-[color:var(--color-ink-muted)]">
      <p>{title}</p>
      {action}
    </div>
  )
}
