import { Link } from 'react-router-dom'
import { useLegalDocuments } from '@/api/hooks/useLegal'
import { Card, Notice } from '@/components/ui/Primitives'

/**
 * سياسة الخصوصية وشروط الاستخدام — **صفحة عامة بلا تسجيل**.
 *
 * `compliance/requirements.md`: «قابلتان للقراءة بلا تسجيل». وقبلها كانت
 * شاشة التسجيل تطلب «قرأت السياسة والشروط وأوافق» ولا رابط يفتحهما.
 *
 * والنص **من الخادم كما هو**، بلا تنسيق يغيّره: البصمة المخزَّنة عند القبول
 * تُحسب من هذا النص بالضبط.
 */
export function LegalScreen() {
  const { data, isPending, isError } = useLegalDocuments()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-[var(--space-4)] p-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">السياسة والشروط</h1>

      {isPending && <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>}
      {isError && <Notice tone="danger">تعذّر تحميل النص. حاول بعد قليل.</Notice>}

      {data !== undefined && (
        <>
          <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
            النسخة {data.version}
          </p>
          <LegalText title="سياسة الخصوصية" text={data.privacy_policy} />
          <LegalText title="شروط الاستخدام" text={data.terms_of_use} />
        </>
      )}

      <Link to="/" className="text-[color:var(--color-brand-primary)] underline">
        رجوع
      </Link>
    </div>
  )
}

/**
 * النص كما هو.
 *
 * `pre-wrap` لا محوّل Markdown: المحوّل يغيّر ما يُعرض، والبصمة تخص النص.
 * ومكتبة عرض Markdown اعتمادية ثالثة في صفحة يُفترض أن تطمئن.
 */
export function LegalText({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <h2 className="mb-[var(--space-3)] font-semibold">{title}</h2>
      <div className="whitespace-pre-wrap text-[length:var(--text-body)] leading-relaxed">{text}</div>
    </Card>
  )
}
