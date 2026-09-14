import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMe } from '@/api/hooks/useAuth'
import { useAcceptPolicy, useLegalDocuments } from '@/api/hooks/useLegal'
import { Button, Card, Notice } from '@/components/ui/Primitives'
import { LegalText } from '@/screens/LegalScreen'

/**
 * بوابة السياسة — **مستويان**، قرارك في جلسة البناء.
 *
 * - **تغيير جوهري**: شاشة كاملة تحجب التطبيق، بالنص كاملًا وزر القبول. والخادم
 *   يرفض ما عداها بـ403، فهذي الشاشة **انعكاس للمنع لا المنع نفسه**.
 * - **تحديث بسيط**: شريط يُعرض ولا يمس الاستخدام.
 *
 * ## ولا تُحتجز البيانات رهينة
 *
 * من يرفض الشروط الجديدة يصل إلى خصوصيته: يصدّر بياناته ويحذف حسابه. الخادم
 * يُبقي تلك المسارات مفتوحة، والشاشة تدلّه عليها بدل أن تتركه أمام زر واحد.
 */
/** ما يبقى متاحًا قبل القبول — يطابق ما يُبقيه الخادم مفتوحًا. */
const OPEN_WHILE_REQUIRED = ['/privacy', '/legal']

export function PolicyGate({ children }: { children: ReactNode }) {
  const { data: user } = useMe()
  const { pathname } = useLocation()

  if (user?.policy_acceptance_required === true) {
    // الخصوصية مفتوحة ليصدّر ويحذف من لا يوافق — لا بيانات رهينة.
    if (OPEN_WHILE_REQUIRED.includes(pathname)) {
      return (
        <>
          <div className="border-b border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-sunken)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-caption)]">
            التطبيق متوقف لحين ما توافق على النسخة الجديدة.{' '}
            <Link to="/" className="underline">
              ارجع للموافقة
            </Link>
          </div>
          {children}
        </>
      )
    }

    return <RequiredAcceptance />
  }

  return (
    <>
      {user?.policy_update_available === true && <MinorUpdateBanner />}
      {children}
    </>
  )
}

function RequiredAcceptance() {
  const { data } = useLegalDocuments()
  const accept = useAcceptPolicy()
  const [readAll, setReadAll] = useState(false)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-[var(--space-4)] p-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">تحديث يحتاج موافقتك</h1>

      <Notice tone="warning">
        غيّرنا سياسة الخصوصية أو شروط الاستخدام تغييرًا يحتاج موافقتك. التطبيق متوقف لحين ما
        تقرأها وتوافق.
      </Notice>

      {data !== undefined && (
        <>
          <LegalText title="سياسة الخصوصية" text={data.privacy_policy} />
          <LegalText title="شروط الاستخدام" text={data.terms_of_use} />

          {/*
            **قبول صريح لا صندوق مؤشَّر مسبقًا.** والزر لا يُفعَّل قبله — لا
            «بمتابعتك فأنت موافق».
          */}
          <label className="flex min-h-[var(--touch-min)] items-start gap-[var(--space-2)]">
            <input
              type="checkbox"
              checked={readAll}
              onChange={(event) => setReadAll(event.target.checked)}
              className="mt-1 size-5"
            />
            <span>قرأت النسخة {data.version} وأوافق عليها.</span>
          </label>

          <Button disabled={!readAll || accept.isPending} onClick={() => accept.mutate()}>
            {accept.isPending ? 'لحظة…' : 'أوافق وأكمل'}
          </Button>
        </>
      )}

      <Card>
        <p className="mb-[var(--space-2)] font-semibold">ما توافق؟</p>
        <p className="mb-[var(--space-3)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          ما نحتجز بياناتك. تقدر تصدّرها وتحذف حسابك بلا ما توافق على شي.
        </p>
        <Link to="/privacy" className="text-[color:var(--color-brand-primary)] underline">
          صدّر بياناتي أو احذف حسابي
        </Link>
      </Card>
    </div>
  )
}

/**
 * التحديث البسيط.
 *
 * «اطّلعت» تسجّل قبول النسخة، فيبقى دليلًا على ما قُرئ. والإغلاق بلا ضغطها
 * يخفي الشريط للجلسة وحدها — لا يُلحّ، ولا يُنسى.
 */
function MinorUpdateBanner() {
  const accept = useAcceptPolicy()
  const [hidden, setHidden] = useState(false)

  if (hidden) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] border-b border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-sunken)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-caption)]">
      <span>حدّثنا السياسة والشروط تحديثًا بسيطًا ما يغيّر شي في استخدامك.</span>

      <div className="flex items-center gap-[var(--space-2)]">
        <Link to="/legal" className="underline">
          اقرأ
        </Link>
        <button
          type="button"
          className="min-h-[var(--touch-min)] px-[var(--space-2)] font-semibold text-[color:var(--color-brand-primary)]"
          disabled={accept.isPending}
          onClick={() => accept.mutate()}
        >
          اطّلعت
        </button>
        <button
          type="button"
          aria-label="إخفاء"
          className="min-h-[var(--touch-min)] min-w-[var(--touch-min)]"
          onClick={() => setHidden(true)}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
