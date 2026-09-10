import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  AuditEntry,
  Debt,
  DebtPayment,
  Statistics,
  Tag,
  Transaction,
  UserCard,
} from '@/api/types'
import { draftQueue } from '@/lib/offline/queue'
import { keys, moneyTouchingKeys } from './keys'

function useInvalidatingMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of moneyTouchingKeys) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

// ── العمليات ──────────────────────────────────────────────────────────

export interface TransactionFilters {
  from?: string
  to?: string
  salary_cycle_id?: number
  tags?: number[]
  tags_mode?: 'any' | 'all'
  include_auto?: boolean
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: keys.transactions({ ...filters }),
    queryFn: async () => (await api.get<Transaction[]>('/transactions', { ...filters })).data,
  })
}

/**
 * حفظ عملية، أو وضعها في الطابور بلا إنترنت.
 *
 * **المسودة تظهر معلَّمة ولا تدخل في أي رقم** حتى تصل الخادم.
 */
export function useSaveTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Record<string, unknown> & { id?: number }) => {
      const { id, ...body } = input

      if (id === undefined && !navigator.onLine) {
        return { queued: true as const, draft: draftQueue.add(body) }
      }

      const saved =
        id === undefined
          ? await api.post<Transaction>('/transactions', body)
          : await api.put<Transaction>(`/transactions/${id}`, body)

      return { queued: false as const, transaction: saved.data, message: saved.message }
    },
    onSuccess: () => {
      for (const key of moneyTouchingKeys) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useDeleteTransaction() {
  return useInvalidatingMutation(async (id: number) => api.delete(`/transactions/${id}`))
}

// ── البطاقات ──────────────────────────────────────────────────────────

export function useCards() {
  return useQuery({
    queryKey: keys.cards,
    queryFn: async () => (await api.get<UserCard[]>('/user-cards')).data,
  })
}

export function useSaveCard() {
  return useInvalidatingMutation(async (input: Partial<UserCard> & { id?: number }) => {
    const { id, ...body } = input

    return id === undefined
      ? (await api.post<UserCard>('/user-cards', body)).data
      : (await api.put<UserCard>(`/user-cards/${id}`, body)).data
  })
}

export function useDeleteCard() {
  return useInvalidatingMutation(async (id: number) => api.delete(`/user-cards/${id}`))
}

// ── الوسوم ────────────────────────────────────────────────────────────

export function useTags(scope?: 'budget' | 'transaction') {
  return useQuery({
    queryKey: [...keys.tags, scope ?? 'all'],
    queryFn: async () => (await api.get<Tag[]>('/tags', { scope })).data,
  })
}

export function useSaveTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Partial<Tag> & { id?: number }) => {
      const { id, ...body } = input

      return id === undefined
        ? (await api.post<Tag>('/tags', body)).data
        : (await api.put<Tag>(`/tags/${id}`, body)).data
    },
    // الوسم **لا يغيّر أي رقم مالي**، فيكفي إبطال الوسوم والعمليات.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.tags })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.tags })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

// ── الديون ────────────────────────────────────────────────────────────

export function useDebts(filters: { type?: string; status?: string } = {}) {
  return useQuery({
    queryKey: keys.debts(filters),
    queryFn: async () => (await api.get<Debt[]>('/debts', filters)).data,
  })
}

export function useSaveDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Partial<Debt> & { id?: number }) => {
      const { id, ...body } = input

      return id === undefined
        ? (await api.post<Debt>('/debts', body)).data
        : (await api.put<Debt>(`/debts/${id}`, body)).data
    },
    // **الديون دفتر مستقل خارج رصيد الرحلة**، فلا تبطل أرقام الرحلة.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useSaveDebtPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      debtId: number
      paymentId?: number
      amount: string
      paid_at: string
      note?: string | null
    }) => {
      const { debtId, paymentId, ...body } = input

      return paymentId === undefined
        ? (await api.post<DebtPayment>(`/debts/${debtId}/payments`, body)).data
        : (await api.put<DebtPayment>(`/debts/${debtId}/payments/${paymentId}`, body)).data
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useDeleteDebtPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { debtId: number; paymentId: number }) =>
      api.delete(`/debts/${input.debtId}/payments/${input.paymentId}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => api.delete(`/debts/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useShareMessage(debtId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['debts', debtId, 'share'],
    queryFn: async () => (await api.get<{ message: string }>(`/debts/${debtId}/share-message`)).data,
    enabled,
  })
}

// ── الإحصائيات والسجل ─────────────────────────────────────────────────

export function useStatistics(params: { period: string; date?: string; salary_cycle_id?: number }) {
  return useQuery({
    queryKey: keys.statistics(params),
    queryFn: async () => (await api.get<Statistics>('/statistics', params)).data,
  })
}

export function useAuditLogs(filters: { from?: string; to?: string; action?: string; entity?: string } = {}) {
  return useQuery({
    queryKey: keys.auditLogs(filters),
    queryFn: async () => (await api.get<AuditEntry[]>('/audit-logs', filters)).data,
  })
}
