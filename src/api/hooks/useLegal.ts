import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { LegalDocuments, User } from '@/api/types'
import { keys } from './keys'

/**
 * السياسة والشروط — **تُقرأ بلا تسجيل**.
 *
 * النص يأتي من الخادم لا من نسخة في الواجهة: الخادم يحسب بصمة القبول من
 * الملف نفسه، ونسخةٌ ثانية هنا تجعل البصمة توثّق نصًّا غير المعروض.
 */
export function useLegalDocuments() {
  return useQuery({
    queryKey: keys.legal,
    queryFn: async () => (await api.get<LegalDocuments>('/legal')).data,
    staleTime: 5 * 60_000,
  })
}

/** قبول نسخة جديدة، أو الاطّلاع على تحديث بسيط — المسار واحد. */
export function useAcceptPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => (await api.post<User>('/legal/accept')).data,
    onSuccess: (user) => {
      queryClient.setQueryData(keys.me, user)
      // ما مُنع قبل القبول يُطلب من جديد.
      void queryClient.invalidateQueries()
    },
  })
}
