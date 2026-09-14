import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { supportSession } from '@/lib/supportSession'

/**
 * شريط «جلسة دعم فني» — **ثابت، لا يُغلق، ويعدّ تنازليًا**.
 *
 * موظف الدعم يرى حساب شخص آخر. الشريط يمنعه أن ينسى ذلك، ويمنع أن تبقى
 * الجلسة مفتوحة في تبويب منسي: يعرض الوقت المتبقي، وعند انتهائه يمحو الرمز.
 *
 * والمنع الحقيقي في الخادم لا هنا: `RestrictsSupportSession`.
 */
export function SupportSessionBanner() {
  const [remaining, setRemaining] = useState(() => secondsLeft())
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      const left = secondsLeft()

      setRemaining(left)

      if (left <= 0) {
        supportSession.clear()
        setEnded(true)
        window.clearInterval(timer)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  async function leave() {
    try {
      await api.post('/support-session/leave')
    } finally {
      // يُمحى محليًّا في كل حال: «اخرج» تعني خرجت، ولو تعذّر الطلب.
      supportSession.clear()
      setEnded(true)
    }
  }

  if (ended) {
    return (
      <div role="alert" className="fixed inset-0 z-50 grid place-items-center bg-[color:var(--color-surface-page)] p-[var(--space-4)]">
        <p className="text-[length:var(--text-title)] font-semibold">انتهت جلسة الدعم. أغلق هذا التبويب.</p>
      </div>
    )
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = String(remaining % 60).padStart(2, '0')

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-between gap-[var(--space-3)] bg-[color:var(--color-state-danger)] px-[var(--space-4)] py-[var(--space-2)] pt-[calc(var(--space-2)+env(safe-area-inset-top))] text-[color:var(--color-ink-inverse)]"
    >
      <span className="font-semibold">
        جلسة دعم فني · تنتهي خلال {minutes}:{seconds}
      </span>
      <span className="hidden text-[length:var(--text-caption)] sm:inline">
        كل إجراء مسجَّل. لا تستطيع منح موافقة أو تصدير بياناته أو حذف حسابه.
      </span>
      <button
        type="button"
        onClick={() => void leave()}
        className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] border border-[color:var(--color-ink-inverse)] px-[var(--space-3)]"
      >
        اخرج
      </button>
    </div>
  )
}

function secondsLeft(): number {
  const expires = supportSession.expiresAt()

  return expires === null ? 0 : Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000))
}
