import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { usePrivacy } from '@/context/PrivacyContext'
import { useLogout } from '@/api/hooks/useAuth'
import { useDraftSync } from '@/lib/offline/useDraftSync'
import { Notice } from '@/components/ui/Primitives'

/**
 * الإطار العام.
 *
 * **الجوال أولًا:** شريط تنقّل سفلي بأهداف لمس لا تقل عن `--touch-min`،
 * و`100dvh` لا `100vh` — الثاني يحسب شريط المتصفح المتحرك فتُقصّ الشاشة.
 */

const primary = [
  { to: '/', label: 'الرئيسية' },
  { to: '/budgets', label: 'الميزانيات' },
  { to: '/add', label: 'إضافة' },
  { to: '/statistics', label: 'الإحصائيات' },
  { to: '/settings', label: 'المزيد' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { hidden, toggle } = usePrivacy()
  const logout = useLogout()
  const navigate = useNavigate()
  const { drafts, isSyncing, sync } = useDraftSync()

  const pending = drafts.filter((draft) => draft.lastError === undefined).length
  const failed = drafts.filter((draft) => draft.lastError !== undefined).length

  return (
    <div className="flex min-h-dvh flex-col bg-[color:var(--color-surface-page)]">
      {/*
        `pt-[env(safe-area-inset-top)]` لازم: الصفحة تعمل بشريط حالة شفاف على
        iOS بعد التثبيت، فبدونه ينزلق الرأس تحت الساعة والبطارية.
      */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-[var(--space-3)] border-b border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] px-[var(--space-4)] py-[var(--space-2)] pt-[calc(var(--space-2)+env(safe-area-inset-top))]">
        <span className="text-[length:var(--text-title)] font-semibold text-[color:var(--color-brand-primary)]">
          قنطار
        </span>

        <div className="flex items-center gap-[var(--space-2)]">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={hidden}
            className="min-h-[var(--touch-min)] min-w-[var(--touch-min)] rounded-[var(--radius-md)] px-[var(--space-2)] text-[color:var(--color-ink-muted)]"
          >
            {/* إخفاء بصري لا تشفير — القسم ٨. */}
            {hidden ? 'إظهار الأرقام' : 'إخفاء الأرقام'}
          </button>

          <button
            type="button"
            onClick={() => {
              logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
            }}
            className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] px-[var(--space-2)] text-[color:var(--color-ink-muted)]"
          >
            خروج
          </button>
        </div>
      </header>

      {(pending > 0 || failed > 0) && (
        <div className="px-[var(--space-4)] pt-[var(--space-3)]">
          <Notice tone={failed > 0 ? 'danger' : 'warning'}>
            {failed > 0 ? (
              <span>{failed} مسودة لم تُحفظ لخطأ في بياناتها. راجعها من شاشة الإضافة.</span>
            ) : (
              <span className="flex items-center justify-between gap-[var(--space-3)]">
                <span>
                  {pending} مسودة بانتظار الاتصال. **لا تدخل في أي رقم** حتى تُحفظ.
                </span>
                <button type="button" onClick={() => void sync()} disabled={isSyncing}>
                  {isSyncing ? 'يزامن…' : 'زامن الآن'}
                </button>
              </span>
            )}
          </Notice>
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 p-[var(--space-4)] pb-[calc(var(--touch-min)+var(--space-6))]">
        {children}
      </main>

      <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] pb-[env(safe-area-inset-bottom)]">
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-h-[var(--touch-min)] items-center justify-center py-[var(--space-2)] text-[length:var(--text-caption)] ${
                isActive
                  ? 'font-semibold text-[color:var(--color-brand-primary)]'
                  : 'text-[color:var(--color-ink-muted)]'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
