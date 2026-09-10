import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getToken } from '@/api/client'
import type { ConsentStatusMap, ImpersonationRequest, PrivacyDashboard } from '@/api/types'
import { keys } from './keys'

/**
 * لوحة الخصوصية.
 *
 * **سحب الموافقة بنقرة واحدة**: `DELETE` واحدة مقابل `POST` واحدة، بلا سبب
 * مطلوب وبلا شاشة إقناع — `compliance/consent-model.md`.
 */

export function usePrivacy() {
  return useQuery({
    queryKey: keys.privacy,
    queryFn: async () => (await api.get<PrivacyDashboard>('/privacy')).data,
  })
}

export function useConsentText(type: string | null) {
  return useQuery({
    queryKey: keys.consentText(type ?? ''),
    enabled: type !== null,
    queryFn: async () =>
      (
        await api.get<{ type: string; version: string; text: string; fallback: string }>(
          `/privacy/consents/${type}/text`,
        )
      ).data,
  })
}

export function useSetConsent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, granted }: { type: string; granted: boolean }) =>
      granted
        ? (await api.post<ConsentStatusMap>(`/privacy/consents/${type}`)).data
        : (await api.delete<ConsentStatusMap>(`/privacy/consents/${type}`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.privacy })
      void queryClient.invalidateQueries({ queryKey: keys.consents })
    },
  })
}

export function useSetBackupPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (password: string | null) =>
      password === null
        ? (await api.delete('/privacy/backup-password')).data
        : (await api.put('/privacy/backup-password', { password })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.privacy }),
  })
}

/**
 * ينزّل ملف التصدير.
 *
 * **خارج `api.*` عمدًا**: الرد ملف لا JSON، وتمريره بالطبقة العادية يحاول
 * تفكيكه كـJSON فيفشل. وكلمة المرور تُكتب هنا ولا تُحفظ في أي مكان.
 */
export async function downloadExport(password: string): Promise<void> {
  const token = getToken()

  const response = await fetch('/api/v1/privacy/export', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ password }),
  })

  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as { message?: string } | null

    throw new Error(envelope?.message ?? 'تعذّر التصدير.')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `qintar-${new Date().toISOString().slice(0, 10)}.zip`
  link.click()

  URL.revokeObjectURL(url)
}

export function useDeletionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (email: string) => (await api.post('/privacy/deletion', { email })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.privacy }),
  })
}

export function useCancelDeletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => (await api.delete('/privacy/deletion')).data,
    onSuccess: () => {
      // كل شيء يرجع يشتغل، فيُبطَل الكاش كله لا صفحة الخصوصية وحدها.
      void queryClient.invalidateQueries()
    },
  })
}

export function useImpersonationRequests() {
  return useQuery({
    queryKey: keys.impersonationRequests,
    queryFn: async () => (await api.get<ImpersonationRequest[]>('/impersonation-requests')).data,
  })
}

export function useAnswerImpersonation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, approve }: { id: number; approve: boolean }) =>
      (await api.post(`/impersonation-requests/${id}/${approve ? 'approve' : 'reject'}`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.impersonationRequests })
      void queryClient.invalidateQueries({ queryKey: keys.privacy })
    },
  })
}
