import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useResendCode, useVerifyEmail } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/client'
import { Button, Card, Field, Input, Notice } from '@/components/ui/Primitives'

export function VerifyEmailScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const verify = useVerifyEmail()
  const resend = useResendCode()

  const email = params.get('email') ?? ''
  const [code, setCode] = useState('')

  const error = verify.error instanceof ApiError ? verify.error : null

  return (
    <div className="grid min-h-dvh place-items-center p-[var(--space-4)]">
      <Card className="w-full max-w-sm">
        <h1 className="mb-[var(--space-2)] text-[length:var(--text-title)] font-semibold">
          فعّل بريدك
        </h1>
        <p className="mb-[var(--space-4)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          أرسلنا كودًا من ست خانات إلى {email}. صالح عشر دقائق.
        </p>

        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()
            verify.mutate({ email, code }, { onSuccess: () => navigate('/login', { replace: true }) })
          }}
        >
          <Field label="الكود">
            <Input
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center tracking-[0.5em] tabular-nums"
              required
            />
          </Field>

          {error !== null && <Notice tone="danger">{error.message}</Notice>}

          <Button type="submit" disabled={code.length !== 6 || verify.isPending}>
            فعّل
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={resend.isPending}
            onClick={() => resend.mutate(email)}
          >
            {resend.isSuccess ? 'أرسلنا كودًا جديدًا' : 'أرسل كودًا جديدًا'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
