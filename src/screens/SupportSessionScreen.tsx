import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/api/client'
import type { ImpersonationRequest } from '@/api/types'
import { supportSession } from '@/lib/supportSession'
import { Card, Notice } from '@/components/ui/Primitives'

/**
 * يستقبل رابط الدخول من لوحة الأدمن.
 *
 * الرمز في جزء `#` من الرابط: لا يُرسل للخادم ولا في رأس `Referer`. ويُمحى من
 * شريط العنوان **قبل أي طلب**، فلا يبقى في سجل المتصفح.
 *
 * ولا يُستبدل إلا مرة: React يشغّل التأثير مرتين في وضع التطوير، والرمز لمرة
 * واحدة — فالمرة الثانية تفشل وتُظهر خطأً كاذبًا لولا المرجع.
 */
export function SupportSessionScreen() {
  // **يُقرأ الرمز عند الإنشاء**، قبل أن يمحوه التأثير من العنوان.
  const [code] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('code'))
  const [failure, setFailure] = useState<string | null>(() =>
    code === null ? 'الرابط ناقص. افتحه من لوحة الأدمن من جديد.' : null,
  )
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    // يُمحى الرمز من العنوان والسجل قبل أي طلب.
    window.history.replaceState(null, '', '/support-session')

    if (code === null) return

    api
      .post<{ request: ImpersonationRequest; token: string; expires_at: string }>(
        '/support-session/redeem',
        { code },
      )
      .then(({ data }) => {
        supportSession.start(data.token, data.expires_at, data.request.id)
        // إعادة تحميل كاملة: الكاش كله يُبنى من جديد بهوية المستخدم.
        window.location.replace('/')
      })
      .catch((error: unknown) =>
        setFailure(error instanceof ApiError ? error.message : 'تعذّر فتح الجلسة.'),
      )
  }, [code])

  return (
    <div className="grid min-h-dvh place-items-center p-[var(--space-4)]">
      <Card className="w-full max-w-sm">
        <h1 className="mb-[var(--space-3)] text-[length:var(--text-title)] font-semibold">جلسة دعم فني</h1>
        {failure === null ? (
          <p className="text-[color:var(--color-ink-muted)]">نفتح الجلسة…</p>
        ) : (
          <Notice tone="danger">{failure}</Notice>
        )}
      </Card>
    </div>
  )
}
