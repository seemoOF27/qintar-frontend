import { useState } from 'react'
import { ApiError } from '@/api/client'
import { useContactThread, useContactThreads, useOpenThread, useReplyToThread } from '@/api/hooks/useContact'
import { Button, Card, EmptyState, Field, Notice, Select } from '@/components/ui/Primitives'

/**
 * تواصل معنا.
 *
 * **الرد هنا لا في البريد.** يصلك بريد يقول «وصلك رد» بلا نصه: الرسالة قد
 * تحمل تفاصيل مشكلتك المالية، والبريد يمر بخوادم لا نملكها.
 *
 * ويعمل **والحساب معلَّق**: من عُلّق حسابه يحتاج أن يسأل لماذا.
 */
const TYPES = [
  { value: 'issue', label: 'مشكلة' },
  { value: 'inquiry', label: 'سؤال' },
  { value: 'suggestion', label: 'اقتراح' },
]

const typeLabel = (type: string) => TYPES.find((item) => item.value === type)?.label ?? type

export function ContactScreen() {
  const { data: threads } = useContactThreads()
  const [openId, setOpenId] = useState<number | null>(null)

  if (openId !== null) {
    return <ThreadView id={openId} onBack={() => setOpenId(null)} />
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">تواصل معنا</h1>

      <NewThreadForm />

      <section className="flex flex-col gap-[var(--space-2)]">
        <h2 className="font-semibold">رسائلك</h2>

        {(threads ?? []).length === 0 && <EmptyState title="ما أرسلت رسالة بعد." />}

        {(threads ?? []).map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => setOpenId(thread.id)}
            className="min-h-[var(--touch-min)] text-start"
          >
            <Card>
              <div className="flex items-center justify-between gap-[var(--space-2)]">
                <span className="font-semibold">{typeLabel(thread.type)}</span>
                <span className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                  {thread.status === 'open' ? 'مفتوحة' : 'محلولة'}
                  {(thread.unread_replies ?? 0) > 0 && (
                    <span className="ms-[var(--space-2)] rounded-[var(--radius-full)] bg-[color:var(--color-brand-primary)] px-[var(--space-2)] text-[color:var(--color-ink-inverse)]">
                      رد جديد
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-[var(--space-1)] line-clamp-2 text-[color:var(--color-ink-base)]">{thread.message}</p>
            </Card>
          </button>
        ))}
      </section>
    </div>
  )
}

function NewThreadForm() {
  const open = useOpenThread()
  const [type, setType] = useState('issue')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const error = open.error instanceof ApiError ? open.error : null

  return (
    <Card>
      <form
        className="flex flex-col gap-[var(--space-3)]"
        onSubmit={(event) => {
          event.preventDefault()
          open.mutate(
            { type, message },
            {
              onSuccess: () => {
                setMessage('')
                setSent(true)
              },
            },
          )
        }}
      >
        <Field label="نوع الرسالة">
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="رسالتك" error={error?.fieldError('message')} hint="بنرد عليك هنا، ويوصلك بريد تنبيه بلا نص الرد.">
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              setSent(false)
            }}
            rows={4}
            required
            minLength={10}
            className="w-full rounded-[var(--radius-sm)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] p-[var(--space-3)]"
          />
        </Field>

        {sent && <Notice tone="positive">وصلتنا رسالتك.</Notice>}
        {error !== null && !error.isValidation && <Notice tone="danger">{error.message}</Notice>}

        <Button type="submit" disabled={open.isPending || message.trim().length < 10}>
          {open.isPending ? 'يرسل…' : 'أرسل'}
        </Button>
      </form>
    </Card>
  )
}

function ThreadView({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: thread } = useContactThread(id)
  const reply = useReplyToThread()
  const [body, setBody] = useState('')

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <button type="button" onClick={onBack} className="min-h-[var(--touch-min)] self-start underline">
        رجوع
      </button>

      {thread !== undefined && (
        <>
          <Card>
            <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
              {typeLabel(thread.type)} · {thread.status === 'open' ? 'مفتوحة' : 'محلولة'}
            </p>
            <p className="mt-[var(--space-2)] whitespace-pre-wrap">{thread.message}</p>
          </Card>

          {(thread.replies ?? []).map((item) => (
            <Card key={item.id} className={item.author === 'support' ? 'border-[color:var(--color-brand-primary)]' : ''}>
              <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
                {item.author === 'support' ? 'الدعم' : 'أنت'} ·{' '}
                {new Date(item.created_at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}
              </p>
              <p className="mt-[var(--space-2)] whitespace-pre-wrap">{item.body}</p>
            </Card>
          ))}

          <Card>
            <form
              className="flex flex-col gap-[var(--space-3)]"
              onSubmit={(event) => {
                event.preventDefault()
                reply.mutate({ id, body }, { onSuccess: () => setBody('') })
              }}
            >
              <Field label="أضف رد">
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={3}
                  className="w-full rounded-[var(--radius-sm)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] p-[var(--space-3)]"
                />
              </Field>
              <Button type="submit" disabled={reply.isPending || body.trim().length < 2}>
                {reply.isPending ? 'يرسل…' : 'أرسل'}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  )
}
