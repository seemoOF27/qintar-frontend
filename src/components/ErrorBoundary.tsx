import { Component, type ErrorInfo, type ReactNode } from 'react'
import { api } from '@/api/client'

/**
 * حدّ الأعطال في الواجهة.
 *
 * ## ما يُرسل، وإلى أين
 *
 * **إلى خادمنا وحده.** الواجهة لا تحمل حزمة مراقبة أصلًا — حارس في
 * `frontend-guards` يمنع استيرادها، لأن «عدم التحميل أقوى من تهيئة معطّلة».
 * والخادم هو من يقرر إن كان التقرير يغادر، ببوابة `error_monitoring`.
 * **بوابة واحدة لثلاث طبقات** بدل ثلاث تتباعد.
 *
 * **وحقلان لا غير**: صنف الخطأ واسم الشاشة. لا رسالة، ولا أثر مكدس، ولا
 * عنوان — كلها قد تحمل مبلغًا أو اسم تاجر أو معرّفًا. والخادم يرفض ما عداهما
 * أصلًا.
 *
 * ## والفشل لا يُخفى
 *
 * الشاشة تقول إن شيئًا انكسر وتعرض طريق العودة. حدُّ أعطال يبتلع الخطأ ويعرض
 * شاشة فارغة يجعل المستخدم يظن أن بياناته ضاعت.
 */
interface Props {
  children: ReactNode
  /** اسم الشاشة — حروف وأرقام فقط، فالخادم يرفض غيرها. */
  screen: string
}

interface State {
  broken: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { broken: false }

  static getDerivedStateFromError(): State {
    return { broken: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // **الاسم وحده.** `error.message` قد تحمل مبلغًا، و`_info.componentStack`
    // يحمل شجرة المكوّنات بخصائصها.
    void api
      .post('/client-errors', { name: error.name, screen: this.props.screen })
      .catch(() => undefined)
  }

  render(): ReactNode {
    if (!this.state.broken) {
      return this.props.children
    }

    return (
      <div className="flex flex-col items-center gap-[var(--space-3)] p-[var(--space-5)] text-center">
        <p className="text-[length:var(--text-title)] font-semibold">انكسر شي في الشاشة</p>
        <p className="text-[color:var(--color-ink-muted)]">
          بياناتك ما تأثرت. جرّب تحدّث الصفحة، ولو تكرر كلّمنا من «تواصل معنا».
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] bg-[color:var(--color-brand-primary)] px-[var(--space-4)] text-[color:var(--color-ink-inverse)]"
        >
          حدّث الصفحة
        </button>
      </div>
    )
  }
}
