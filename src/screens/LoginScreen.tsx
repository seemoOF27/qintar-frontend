import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLogin } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/client'
import { Button, Card, Field, Input, Notice } from '@/components/ui/Primitives'

export function LoginScreen() {
  const login = useLogin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const error = login.error instanceof ApiError ? login.error : null

  return (
    <div className="grid min-h-dvh place-items-center p-[var(--space-4)]">
      <Card className="w-full max-w-sm">
        <h1 className="mb-[var(--space-4)] text-[length:var(--text-display)] font-semibold text-[color:var(--color-brand-primary)]">
          قنطار
        </h1>

        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault()
            login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) })
          }}
        >
          <Field label="البريد">
            <Input
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="كلمة المرور">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error !== null && <Notice tone="danger">{error.message}</Notice>}

          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? 'لحظة…' : 'دخول'}
          </Button>
        </form>

        <p className="mt-[var(--space-4)] text-center text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          ما عندك حساب؟{' '}
          <Link to="/register" className="text-[color:var(--color-brand-primary)]">
            سجّل جديدًا
          </Link>
        </p>
      </Card>
    </div>
  )
}
