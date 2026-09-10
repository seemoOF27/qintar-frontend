import { useState } from 'react'
import { ApiError } from '@/api/client'
import {
  downloadExport,
  useAnswerImpersonation,
  useCancelDeletion,
  useConsentText,
  useDeletionRequest,
  useImpersonationRequests,
  usePrivacy,
  useSetBackupPassword,
  useSetConsent,
} from '@/api/hooks/usePrivacy'
import { useMe } from '@/api/hooks/useAuth'
import { Button, Card, Field, Input, Notice } from '@/components/ui/Primitives'

/**
 * لوحة الخصوصية — `compliance/requirements.md`.
 *
 * ستة بنود إلزامية، وكلها ظاهرة هنا:
 *
 * - كل موافقة بحالتها وتاريخها ومفتاح تشغيل/إيقاف
 * - «آخر مرة خرجت بياناتك: متى ولأي غرض» — **وتُقال صراحةً حين لم تخرج**
 * - سجل نشاط مقروء، **بلا مبالغ**
 * - صدّر بياناتي · احذف حسابي
 * - **السحب بنقرة واحدة**: بلا سبب، بلا شاشة إقناع، بلا خطوة زائدة عن المنح
 */

const PURPOSES: { key: string; label: string; note: string }[] = [
  {
    key: 'ai_parsing',
    label: 'تحليل الرسائل والفواتير',
    note: 'يرسل نص الرسالة أو صورة الفاتورة لمزوّد خارجي.',
  },
  {
    key: 'email_backup',
    label: 'النسخ الاحتياطي بالبريد',
    note: 'يرسل نسخة يومية مشفّرة لبريدك.',
  },
  {
    key: 'error_monitoring',
    label: 'مراقبة الأخطاء',
    note: 'يرسل تقرير عطل منقّى من أي بيانة مالية.',
  },
  {
    key: 'card_integration',
    label: 'ربط البطاقات',
    note: 'يجلب بيانات بطاقات عامة. ما يرسل صرفك لأي جهة.',
  },
]

function formatDate(value: string | null): string {
  if (value === null) return '—'

  return new Date(value).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })
}

export function PrivacyScreen() {
  const { data: user } = useMe()
  const { data: privacy } = usePrivacy()
  const { data: requests } = useImpersonationRequests()

  const setConsent = useSetConsent()
  const setBackupPassword = useSetBackupPassword()
  const requestDeletion = useDeletionRequest()
  const cancelDeletion = useCancelDeletion()
  const answer = useAnswerImpersonation()

  const [reading, setReading] = useState<string | null>(null)
  const { data: consentText } = useConsentText(reading)

  const [backupPassword, setBackupPassword2] = useState('')
  const [exportPassword, setExportPassword] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const pending = (requests ?? []).filter((request) => request.status === 'pending')
  const frozen = privacy?.deletion.scheduled_for != null

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">الخصوصية</h1>

      {notice !== null && <Notice tone="positive">{notice}</Notice>}
      {failure !== null && <Notice tone="danger">{failure}</Notice>}

      {/* طلب دعم معلّق أولًا: عليه مهلة، وتأخيره رفضٌ بحكم الوقت. */}
      {pending.map((request) => (
        <Notice key={request.id} tone="warning">
          <p className="mb-[var(--space-2)] font-semibold">
            {request.requested_by ?? 'الدعم الفني'} يطلب الدخول لحسابك
          </p>
          <p className="mb-[var(--space-2)]">{request.reason}</p>
          <p className="mb-[var(--space-3)] text-[length:var(--text-caption)]">
            المهلة تنتهي {new Date(request.response_deadline).toLocaleTimeString('ar-SA')}. بلا ردّك ما
            يقدر يدخل.
          </p>
          <div className="flex gap-[var(--space-2)]">
            <Button onClick={() => answer.mutate({ id: request.id, approve: true })}>وافق</Button>
            <Button variant="ghost" onClick={() => answer.mutate({ id: request.id, approve: false })}>
              ارفض
            </Button>
          </div>
        </Notice>
      ))}

      {frozen && (
        <Notice tone="danger">
          <p className="mb-[var(--space-2)]">
            طلبت حذف حسابك. الحذف الفعلي يوم {formatDate(privacy?.deletion.scheduled_for ?? null)}،
            والحساب مجمّد لين ذاك اليوم.
          </p>
          <Button
            onClick={() =>
              cancelDeletion.mutate(undefined, {
                onSuccess: () => setNotice('ألغينا طلب الحذف. حسابك شغّال زي أول.'),
              })
            }
          >
            ألغِ الطلب
          </Button>
        </Notice>
      )}

      {/* ── أين ذهبت بياناتك ─────────────────────────────────────────── */}
      <Card>
        <h2 className="mb-[var(--space-2)] font-semibold">أين ذهبت بياناتك</h2>

        {privacy?.data_egress.ever === false ? (
          // **يُقال صراحةً.** الصمت هنا يُقرأ شكًّا.
          <p>ما خرجت بياناتك من هذا التطبيق ولا مرة.</p>
        ) : (
          <div className="flex flex-col gap-[var(--space-2)]">
            <p>
              آخر مرة: {privacy?.data_egress.last?.destination} —{' '}
              {formatDate(privacy?.data_egress.last?.occurred_at ?? null)}
            </p>
            <ul className="flex flex-col gap-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
              {Object.entries(privacy?.data_egress.per_purpose ?? {}).map(([purpose, event]) => (
                <li key={purpose}>
                  {purpose}: {event.destination} — {formatDate(event.occurred_at)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* ── الأغراض ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-[var(--space-2)]">
        <h2 className="font-semibold">ما وافقت عليه</h2>

        {PURPOSES.map((purpose) => {
          const state = privacy?.consents[purpose.key]

          return (
            <Card key={purpose.key}>
              <div className="flex items-start justify-between gap-[var(--space-3)]">
                <div>
                  <p className="font-semibold">{purpose.label}</p>
                  <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                    {purpose.note}
                  </p>
                  {state?.granted === true && (
                    <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                      مفعّل من {formatDate(state.granted_at)}
                    </p>
                  )}
                </div>

                {/*
                  **نقرة واحدة في الاتجاهين.** لا تأكيد إضافي على الإيقاف ولا
                  سبب مطلوب — الإيقاف أسهل من التشغيل أو مثله، لا أصعب.
                */}
                <Button
                  variant={state?.granted === true ? 'ghost' : 'primary'}
                  onClick={() =>
                    state?.granted === true
                      ? setConsent.mutate({ type: purpose.key, granted: false })
                      : setReading(purpose.key)
                  }
                >
                  {state?.granted === true ? 'أوقفه' : 'فعّله'}
                </Button>
              </div>

              {/* **الإفصاح قبل التفعيل لا بعده**، وبالنص المعروض نفسه. */}
              {reading === purpose.key && consentText !== undefined && (
                <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-2)] border-t border-[color:var(--color-surface-border)] pt-[var(--space-3)]">
                  <pre className="overflow-x-auto whitespace-pre-wrap text-[length:var(--text-caption)]">
                    {consentText.text}
                  </pre>
                  <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                    لو ما فعّلته: {consentText.fallback}
                  </p>
                  <div className="flex gap-[var(--space-2)]">
                    <Button
                      onClick={() => {
                        setConsent.mutate({ type: purpose.key, granted: true })
                        setReading(null)
                      }}
                    >
                      قرأته وأوافق
                    </Button>
                    <Button variant="ghost" onClick={() => setReading(null)}>
                      لا
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </section>

      {/* ── النسخ والتصدير ───────────────────────────────────────────── */}
      <Card>
        <h2 className="mb-[var(--space-2)] font-semibold">نسخة من بياناتك</h2>

        <div className="flex flex-col gap-[var(--space-3)]">
          <Field
            label="كلمة مرور ملف التصدير"
            hint="ما نحفظها. اكتبها كل مرة، وبدونها ما ينزل الملف."
          >
            <Input
              type="password"
              value={exportPassword}
              onChange={(event) => setExportPassword(event.target.value)}
              autoComplete="new-password"
            />
          </Field>

          <Button
            disabled={exportPassword.length < 8}
            onClick={() => {
              setFailure(null)
              downloadExport(exportPassword)
                .then(() => {
                  setExportPassword('')
                  setNotice('نزّلنا الملف. احفظه في مكان تثق فيه.')
                })
                .catch((error: Error) => setFailure(error.message))
            }}
          >
            صدّر بياناتي
          </Button>

          <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
            الملف مشفّر بـAES-256. فك الضغط المدمج في ويندوز وmacOS ما يفتحه — استخدم 7-Zip أو Keka أو
            WinRAR.
          </p>

          {privacy?.consents.email_backup?.granted === true && (
            <div className="flex flex-col gap-[var(--space-2)] border-t border-[color:var(--color-surface-border)] pt-[var(--space-3)]">
              <Field
                label="كلمة مرور النسخة اليومية"
                hint="هذي تُحفظ مشفّرة عشان النسخة تنبني وإنت نايم. من يوصل للخادم وقاعدة البيانات معًا يقدر يفكها."
              >
                <Input
                  type="password"
                  value={backupPassword}
                  onChange={(event) => setBackupPassword2(event.target.value)}
                  autoComplete="new-password"
                />
              </Field>

              <div className="flex gap-[var(--space-2)]">
                <Button
                  disabled={backupPassword.length < 8}
                  onClick={() =>
                    setBackupPassword.mutate(backupPassword, {
                      onSuccess: () => {
                        setBackupPassword2('')
                        setNotice('حفظنا كلمة مرور النسخة اليومية.')
                      },
                    })
                  }
                >
                  احفظها
                </Button>

                {privacy.backup.password_set && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setBackupPassword.mutate(null, {
                        onSuccess: () => setNotice('مسحناها. النسخ اليومي يتوقف — ما فيه نسخة بلا تشفير.'),
                      })
                    }
                  >
                    امسحها
                  </Button>
                )}
              </div>

              {!privacy.backup.password_set && (
                <Notice tone="warning">
                  ما فيه كلمة مرور محفوظة، فما تنرسل نسخة يومية. ما نرسل ملف مكشوف أبدًا.
                </Notice>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── سجل النشاط ───────────────────────────────────────────────── */}
      <Card>
        <h2 className="mb-[var(--space-2)] font-semibold">آخر ما صار في حسابك</h2>

        <ul className="flex flex-col gap-[var(--space-1)] text-[length:var(--text-caption)]">
          {(privacy?.activity ?? []).map((entry, index) => (
            <li key={index} className="flex justify-between gap-[var(--space-2)]">
              <span>
                {entry.entity} — {entry.action}
                {entry.is_impersonated && ' (جلسة دعم فني)'}
              </span>
              <span className="text-[color:var(--color-ink-muted)]">{formatDate(entry.at)}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── حذف الحساب ───────────────────────────────────────────────── */}
      {!frozen && (
        <Card>
          <h2 className="mb-[var(--space-2)] font-semibold">حذف الحساب</h2>

          <p className="mb-[var(--space-3)]">
            نجمّد حسابك فورًا ونحذف كل شي بعد سبعة أيام. تقدر تلغي الطلب في أي وقت خلالها. بعدها ما فيه
            رجعة — صدّر بياناتك أولًا لو تبيها.
          </p>

          <div className="flex flex-col gap-[var(--space-2)]">
            <Field label="اكتب بريدك للتأكيد">
              <Input
                dir="ltr"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
              />
            </Field>

            <Button
              variant="ghost"
              disabled={confirmEmail.trim().toLowerCase() !== (user?.email ?? '')}
              onClick={() =>
                requestDeletion.mutate(confirmEmail, {
                  onSuccess: () => setNotice('سجّلنا الطلب. حسابك مجمّد، والحذف بعد سبعة أيام.'),
                  onError: (error) =>
                    setFailure(error instanceof ApiError ? error.message : 'تعذّر تسجيل الطلب.'),
                })
              }
            >
              احذف حسابي
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
