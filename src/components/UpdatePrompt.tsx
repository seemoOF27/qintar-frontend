import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * تحديث التطبيق المثبَّت.
 *
 * **بسؤال لا صامتًا.** التحديث الصامت يعيد تحميل الشاشة تحت يد المستخدم،
 * وقد يكون في منتصف إدخال مصروف فيضيع ما كتبه. فيُعرض شريط ويختار هو.
 *
 * ويُسأل مرة واحدة: من أجّل يبقى على نسخته حتى يفتح التطبيق من جديد.
 */
export function UpdatePrompt() {
  const [ready, setReady] = useState(false)
  const [apply, setApply] = useState<(() => void) | null>(null)

  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setApply(() => () => void update(true))
        setReady(true)
      },
    })
  }, [])

  if (!ready) return null

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-[var(--space-3)] bg-[color:var(--color-brand-primary)] px-[var(--space-4)] py-[var(--space-2)] text-[color:var(--color-ink-inverse)]">
      <span className="text-[length:var(--text-caption)]">فيه نسخة أحدث من قنطار.</span>

      <div className="flex gap-[var(--space-2)]">
        <button
          type="button"
          className="min-h-[var(--touch-min)] px-[var(--space-3)] underline"
          onClick={() => apply?.()}
        >
          حدّث الآن
        </button>
        <button
          type="button"
          className="min-h-[var(--touch-min)] px-[var(--space-3)]"
          onClick={() => setReady(false)}
        >
          لاحقًا
        </button>
      </div>
    </div>
  )
}
