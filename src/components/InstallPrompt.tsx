import { useEffect, useState } from 'react'
import {
  detectPlatform,
  type InstallPromptEvent,
  type Platform,
} from '@/lib/install'

/**
 * زر «ثبّته على جهازك».
 *
 * ثلاث حالات لا رابعة:
 *
 * - **مثبَّت أصلًا** → لا يظهر شيء. عرضُ زر تثبيت داخل تطبيق مثبَّت ارتباك.
 * - **أندرويد أو سطح مكتب** → زر يفتح نافذة المتصفح نفسها.
 * - **Safari على iOS** → خطوات مصوّرة بالكلمات، لأن iOS لا يملك أي واجهة
 *   برمجية للتثبيت. وهذا أكثر ما يحتاجه المستخدم: الخيار مدفون في قائمة
 *   المشاركة ولا يخطر على بال أحد.
 *
 * ومتصفحات iOS الأخرى تُقال لها الحقيقة: افتحه في Safari. إخفاء الزر هناك
 * يترك المستخدم يظن أن التطبيق لا يُثبَّت، وعرضُ خطوات Safari فيها يرسله
 * يبحث عن زر غير موجود.
 *
 * **ولا يُلحّ.** من رفض مرة لا يُسأل ثانية حتى يطلبها بنفسه من الإعدادات.
 */

const DISMISSED_KEY = 'qintar.install.dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function remember(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    /* متصفح يمنع التخزين: يظهر الزر مرة أخرى، ولا ينهار شيء */
  }
}

export function InstallPrompt({ always = false }: { always?: boolean }) {
  const [saved, setSaved] = useState<InstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<Platform>('unsupported')
  const [hidden, setHidden] = useState(() => !always && wasDismissed())
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    setPlatform(detectPlatform(null))

    const onPrompt = (event: Event) => {
      // بلا هذا يفتح المتصفح نافذته وقتما شاء، غالبًا في أسوأ لحظة.
      event.preventDefault()
      setSaved(event as InstallPromptEvent)
      setPlatform('prompt')
    }

    const onInstalled = () => setPlatform('installed')

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (platform === 'installed' || (hidden && !always)) return null
  if (platform === 'unsupported' && !always) return null

  function dismiss() {
    remember()
    setHidden(true)
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[color:var(--color-brand-primary)] bg-[color:var(--color-surface-raised)] p-[var(--space-3)]">
      <p className="font-semibold">ثبّت قنطار على جهازك</p>
      <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
        يفتح من الشاشة الرئيسية بلا شريط متصفح، ويشتغل أسرع. نفس الحساب ونفس البيانات.
      </p>

      {platform === 'prompt' && (
        <div className="flex gap-[var(--space-2)]">
          <button
            type="button"
            className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] bg-[color:var(--color-brand-primary)] px-[var(--space-4)] text-[color:var(--color-ink-inverse)]"
            onClick={() => {
              if (saved === null) return

              void saved.prompt()
              void saved.userChoice.then(({ outcome }) => {
                if (outcome === 'dismissed') dismiss()

                // الحدث يُستهلك مرة واحدة: المتصفح لا يقبل إطلاقه ثانية.
                setSaved(null)
              })
            }}
          >
            ثبّته الآن
          </button>

          <button type="button" className="min-h-[var(--touch-min)] px-[var(--space-3)]" onClick={dismiss}>
            لاحقًا
          </button>
        </div>
      )}

      {platform === 'ios-safari' && (
        <div className="flex flex-col gap-[var(--space-2)]">
          {/*
            iOS لا يملك واجهة تثبيت برمجية، فالخطوات هي كل ما نستطيع. ورمز
            المشاركة يُوصف بالكلمات لأن المستخدم يبحث عن شكل لا عن اسم.
          */}
          <button
            type="button"
            aria-expanded={showSteps}
            className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] bg-[color:var(--color-brand-primary)] px-[var(--space-4)] text-[color:var(--color-ink-inverse)]"
            onClick={() => setShowSteps((open) => !open)}
          >
            كيف أثبّته؟
          </button>

          {showSteps && (
            <ol className="flex list-inside list-decimal flex-col gap-[var(--space-1)] text-[length:var(--text-caption)]">
              <li>اضغط زر المشاركة تحت — مربّع فيه سهم طالع لفوق.</li>
              <li>انزل في القائمة لين تلقى «إضافة إلى الشاشة الرئيسية».</li>
              <li>اضغط «إضافة» فوق على اليسار.</li>
              <li>بيطلع لك أيقونة قنطار مع بقية تطبيقاتك.</li>
            </ol>
          )}

          <button type="button" className="min-h-[var(--touch-min)] px-[var(--space-3)]" onClick={dismiss}>
            لا تذكّرني
          </button>
        </div>
      )}

      {platform === 'ios-other' && (
        <p className="text-[length:var(--text-caption)]">
          افتح هذي الصفحة في Safari عشان تقدر تثبّتها. متصفحات الآيفون الثانية ما تسمح بإضافة
          التطبيقات للشاشة الرئيسية.
        </p>
      )}

      {platform === 'unsupported' && always && (
        <p className="text-[length:var(--text-caption)]">
          متصفحك ما يدعم التثبيت، أو التطبيق مثبَّت أصلًا. جرّب Chrome على أندرويد أو Safari على
          الآيفون.
        </p>
      )}
    </div>
  )
}
