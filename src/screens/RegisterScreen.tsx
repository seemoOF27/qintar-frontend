import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegister } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/client'
import { Button, Card, Field, Input, Notice } from '@/components/ui/Primitives'

/**
 * التسجيل.
 *
 * **قبول صريح للسياسة والشروط** — لا صندوق مؤشَّر مسبقًا ولا «بمتابعتك فأنت
 * موافق». والزر نفسه هو القبول، ونصّه يقول ذلك.
 *
 * ولا رمز دخول قبل توثيق البريد بكود.
 */
export function RegisterScreen() {
  const register = useRegister()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [accepted, setAccepted] = useState(false)

  const error = register.error instanceof ApiError ? register.error : null
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="grid min-h-dvh place-items-center p-[var(--space-4)]">
      <Card className="w-full max-w-sm">
        <h1 className="mb-[var(--space-4)] text-[length:var(--text-title)] font-semibold">
          حساب جديد
        </h1>

        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()
            register.mutate(form, {
              onSuccess: () => navigate(`/verify?email=${encodeURIComponent(form.email)}`),
            })
          }}
        >
          <Field label="الاسم">
            <Input
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              required
              autoComplete="name"
            />
          </Field>

          <Field label="البريد" hint="نرسل له كود تفعيل مرة واحدة">
            <Input
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>

          <Field label="كلمة المرور" error={error?.fieldError('password')}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>

          <Field label="تأكيد كلمة المرور">
            <Input
              type="password"
              value={form.password_confirmation}
              onChange={(e) => set('password_confirmation')(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>

          {/* **قبول صريح.** غير مؤشَّر مسبقًا، وبلا تفعيل صامت. */}
          <label className="flex min-h-[var(--touch-min)] items-start gap-[var(--space-2)] text-[length:var(--text-caption)]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 size-5"
            />
            <span>
              قرأت سياسة الخصوصية وشروط الاستخدام وأوافق عليهما. بياناتك المالية تبقى على خادمنا
              ولا تُرسل لأي جهة إلا بموافقة منفصلة تمنحها أنت.
            </span>
          </label>

          {error !== null && error.fieldError('password') === undefined && (
            <Notice tone="danger">{error.message}</Notice>
          )}

          <Button type="submit" disabled={!accepted || register.isPending}>
            {register.isPending ? 'لحظة…' : 'أنشئ الحساب'}
          </Button>
        </form>

        <p className="mt-[var(--space-4)] text-center text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          عندك حساب؟{' '}
          <Link to="/login" className="text-[color:var(--color-brand-primary)]">
            دخول
          </Link>
        </p>
      </Card>
    </div>
  )
}
