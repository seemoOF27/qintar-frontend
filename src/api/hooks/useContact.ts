import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
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

export function useOpenThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { type: string; message: string }) =>
      (await api.post<ContactThread>('/contact-requests', input)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useReplyToThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: number; body: string }) =>
      (await api.post<ContactThread>(`/contact-requests/${input.id}/replies`, { body: input.body })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}
