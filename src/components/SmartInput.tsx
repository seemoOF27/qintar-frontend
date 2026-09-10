import { useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { useParseMessage, useParseReceipt, useParseRequest } from '@/api/hooks/useParsing'
import type { ParseRequest } from '@/api/types'
import { Button, Card, Field, Notice } from '@/components/ui/Primitives'

/**
 * الإدخال الذكي: رسالة بنكية أو صورة فاتورة.
 *
 * **القاعدة الخامسة مرئية هنا لا مدفونة في الكود:**
 *
 * - إفصاح ثابت فوق الحقل: البيانات تُرسل لطرف ثالث لتحليلها.
 * - **مؤشر مرئي** طوال الانتظار، فلا معالجة صامتة.
 * - ما يعود **يملأ الفورم ولا يحفظ شيئًا** — القسم ٥.٥.
 * - رفض الموافقة أو تعطّل المزودات ينتهي بجملة واحدة: أدخلها يدويًا. والفورم
 *   تحته يعمل كاملًا في الحالتين.
 */
export function SmartInput({ onExtract }: { onExtract: (result: NonNullable<ParseRequest['result']>) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [requestId, setRequestId] = useState<number | null>(null)
  const [consumed, setConsumed] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const parseMessage = useParseMessage()
  const parseReceipt = useParseReceipt()
  const { data: parsed } = useParseRequest(requestId)

  const error =
    parseMessage.error instanceof ApiError
      ? parseMessage.error
      : parseReceipt.error instanceof ApiError
        ? parseReceipt.error
        : null

  const needsConsent = error?.consentType === 'ai_parsing'
  const waiting = parsed?.status === 'queued' || parsed?.status === 'processing'
  const sending = parseMessage.isPending || parseReceipt.isPending

  // يُملأ الفورم مرة واحدة لكل طلب: تكراره يمسح تعديلات المستخدم عليه.
  if (parsed?.status === 'completed' && parsed.result !== null && consumed !== parsed.id) {
    setConsumed(parsed.id)
    onExtract(parsed.result)
  }

  function start(promise: Promise<ParseRequest>) {
    setRequestId(null)
    void promise.then((request) => setRequestId(request.id)).catch(() => undefined)
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        عندك رسالة بنكية أو صورة فاتورة؟
      </Button>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-3)]">
        {/* **الإفصاح قبل الاستخدام لا بعده** — القاعدة الخامسة. */}
        <Notice tone="info">
          نرسل نص الرسالة أو صورة الفاتورة لمزوّد تحليل خارجي ليستخرج المبلغ والتاجر. ما نرسل شيئًا
          آخر، وما نحفظ شيئًا قبل ما تراجعه بنفسك. وتقدر تدخلها يدويًا تحت بلا أي إرسال.
        </Notice>

        <Field label="نص الرسالة البنكية" hint="الصقها كما وصلتك">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            className="min-h-[var(--touch-min)] w-full rounded-[var(--radius-md)] border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-base)] p-[var(--space-3)] text-[length:var(--text-body)] text-[color:var(--color-ink-base)]"
          />
        </Field>

        <Button
          onClick={() => start(parseMessage.mutateAsync(text))}
          disabled={text.trim().length < 10 || sending || waiting}
        >
          حلّل الرسالة
        </Button>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file !== undefined) start(parseReceipt.mutateAsync(file))

            // يُفرَّغ الحقل ليقبل نفس الملف مرة أخرى بعد فشل.
            event.target.value = ''
          }}
        />

        <Button variant="ghost" onClick={() => fileInput.current?.click()} disabled={sending || waiting}>
          أو ارفع صورة فاتورة
        </Button>

        {/* **المؤشر المرئي**: لا معالجة صامتة، والحالة تُقال بالعربية. */}
        {(sending || waiting) && (
          <Notice tone="info">
            <span role="status" aria-live="polite">
              {sending ? 'يُرسل للتحليل…' : parsed?.status === 'processing' ? 'يُحلَّل الآن…' : 'في الطابور…'}
            </span>
          </Notice>
        )}

        {parsed?.status === 'completed' && (
          <Notice tone="positive">
            عبّينا لك الفورم تحت من {parsed.provider ?? 'المزوّد'}. راجعه قبل ما تحفظ — ما انحفظ شي لين
            الآن.
          </Notice>
        )}

        {parsed?.status === 'failed' && <Notice tone="danger">{parsed.failure_reason}</Notice>}

        {needsConsent && (
          <Notice tone="danger">
            {error?.consentFallback ?? 'التحليل مطفأ. أدخل المصروف يدويًا من الفورم تحت.'}
          </Notice>
        )}

        {error !== null && !needsConsent && <Notice tone="danger">{error.message}</Notice>}

        <Button variant="ghost" onClick={() => setOpen(false)}>
          أغلق
        </Button>
      </div>
    </Card>
  )
}
