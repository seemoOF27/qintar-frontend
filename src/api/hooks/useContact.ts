import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getToken } from '@/api/client'
import type { ContactThread } from '@/api/types'

const key = ['contact-requests'] as const

export function useContactThreads() {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<ContactThread[]>('/contact-requests')).data,
  })
}

/** فتح المحادثة يعلّم ردود الدعم مقروءة في الخادم، فتُبطَل القائمة بعده. */
export function useContactThread(id: number | null) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: [...key, id],
    enabled: id !== null,
    queryFn: async () => {
      const thread = (await api.get<ContactThread>(`/contact-requests/${id}`)).data
      void queryClient.invalidateQueries({ queryKey: key, exact: true })

      return thread
    },
  })
}

/** حدود الخادم نفسها، ليُرفض الملف قبل رفعه لا بعده. */
export const ATTACHMENT_LIMITS = {
  perThread: 3,
  bytes: 5 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
}

export function attachmentProblem(file: File): string | null {
  if (!ATTACHMENT_LIMITS.types.includes(file.type)) return 'صور أو PDF فقط.'
  if (file.size > ATTACHMENT_LIMITS.bytes) return 'الملف أكبر من ٥ ميجا.'

  return null
}

/**
 * يفتح المحادثة ثم يرفع المرفقات واحدًا واحدًا.
 *
 * **الرسالة تُحفظ أولًا**: تعذّر رفع صورة لا يضيّع ما كتبه المستخدم، ويُقال له
 * أيها لم يُرفع.
 */
export function useOpenThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { type: string; message: string; files: File[] }) => {
      const thread = (await api.post<ContactThread>('/contact-requests', { type: input.type, message: input.message })).data
      let failed = 0

      for (const file of input.files) {
        try {
          await api.upload(`/contact-requests/${thread.id}/attachments`, 'file', file)
        } catch {
          failed++
        }
      }

      return { thread, failed }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useAttachToThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: number; file: File }) =>
      (await api.upload<ContactThread>(`/contact-requests/${input.id}/attachments`, 'file', input.file)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}

/**
 * ينزّل مرفقًا. **خارج `api.*`**: الرد ملف لا JSON، والرابط المباشر لا يحمل
 * الرمز فيرفضه الخادم.
 */
export async function downloadAttachment(threadId: number, attachment: { id: number; kind: 'image' | 'pdf' }): Promise<void> {
  const token = getToken()

  const response = await fetch(`/api/v1/contact-requests/${threadId}/attachments/${attachment.id}`, {
    headers: token === null ? {} : { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) throw new Error('تعذّر تنزيل المرفق.')

  // الامتداد من الخادم: هو من فحص محتوى الملف عند رفعه.
  const named = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1]
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')

  link.href = url
  link.download = named ?? `attachment-${attachment.id}.${attachment.kind === 'pdf' ? 'pdf' : 'jpg'}`
  link.click()

  URL.revokeObjectURL(url)
}

export function useReplyToThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: number; body: string }) =>
      (await api.post<ContactThread>(`/contact-requests/${input.id}/replies`, { body: input.body })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}
