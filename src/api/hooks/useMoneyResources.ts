import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  AllocationStatus,
  AutoAllocation,
  Budget,
  CyclePreview,
  FixedCommitment,
  PiggyBank,
  SalaryCycle,
} from '@/api/types'
import { keys, moneyTouchingKeys } from './keys'

/**
 * الموارد المالية.
 *
 * كل طفرة تبطل **كل** ما يمس المال: الرقم الواحد يظهر في الرئيسية
 * والإحصائيات وشاشة الميزانيات معًا، فإبطال واحدة يترك الأخريين تكذبان.
 */
function useMoneyMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
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

// ── رحلة الراتب ───────────────────────────────────────────────────────

export function useCycles() {
  return useQuery({
    queryKey: keys.cycles,
    queryFn: async () => (await api.get<SalaryCycle[]>('/salary-cycles')).data,
  })
}

export function useActiveCycle() {
  const query = useCycles()

  return { ...query, data: query.data?.find((cycle) => cycle.status === 'active') ?? null }
}

/** المعاينة **لا تكتب حرفًا**، فهي طفرة بلا إبطال كاش. */
export function usePreviewCycle() {
  return useMutation({
    mutationFn: async (incomeAmount: string) =>
      (await api.post<CyclePreview>('/salary-cycles/preview', { income_amount: incomeAmount })).data,
  })
}

/** التأكيد هو **الطريق الوحيد** لإنشاء رحلة — القاعدة التاسعة. */
export function useConfirmCycle() {
  return useMoneyMutation(
    async (input: { income_amount: string; trigger_method: string }) =>
      (await api.post<SalaryCycle>('/salary-cycles/confirm', { ...input, confirmed: true })).data,
  )
}

export function useCorrectCycleIncome() {
  return useMoneyMutation(async (input: { id: number; income_amount: string }) =>
    api.patch<SalaryCycle>(`/salary-cycles/${input.id}/income`, {
      income_amount: input.income_amount,
    }),
  )
}

// ── الميزانيات ────────────────────────────────────────────────────────

export function useBudgets() {
  return useQuery({
    queryKey: keys.budgets,
    queryFn: async () => {
      const envelope = await api.get<Budget[]>('/budgets')

      return {
        budgets: envelope.data,
        allocation: (envelope.meta?.allocation ?? null) as AllocationStatus | null,
      }
    },
  })
}

export function useSaveBudget() {
  return useMoneyMutation(async (input: Partial<Budget> & { id?: number }) => {
    const { id, ...body } = input

    return id === undefined
      ? (await api.post<Budget>('/budgets', body)).data
      : (await api.put<Budget>(`/budgets/${id}`, body)).data
  })
}

export function useDeleteBudget() {
  return useMoneyMutation(async (id: number) =>
    (await api.delete<{ stays_visible_until_cycle_ends: boolean }>(`/budgets/${id}`)).data,
  )
}

export function useRestoreBudget() {
  return useMoneyMutation(async (id: number) => api.post<Budget>(`/budgets/${id}/restore`))
}

// ── الحصالات ──────────────────────────────────────────────────────────

export function usePiggyBanks() {
  return useQuery({
    queryKey: keys.piggyBanks,
    queryFn: async () => (await api.get<PiggyBank[]>('/piggy-banks')).data,
  })
}

export function useSavePiggyBank() {
  return useMoneyMutation(async (input: Partial<PiggyBank> & { id?: number }) => {
    const { id, ...body } = input

    return id === undefined
      ? (await api.post<PiggyBank>('/piggy-banks', body)).data
      : (await api.put<PiggyBank>(`/piggy-banks/${id}`, body)).data
  })
}

/** السحب مالٌ **يعود** إلى رصيد الرحلة. */
export function useWithdrawFromPiggyBank() {
  return useMoneyMutation(async (input: { id: number; amount: string }) =>
    api.post<PiggyBank>(`/piggy-banks/${input.id}/withdraw`, { amount: input.amount }),
  )
}

export function useDeletePiggyBank() {
  return useMoneyMutation(async (id: number) => api.delete(`/piggy-banks/${id}`))
}

// ── الالتزامات ────────────────────────────────────────────────────────

export function useCommitments() {
  return useQuery({
    queryKey: keys.commitments,
    queryFn: async () => (await api.get<FixedCommitment[]>('/fixed-commitments')).data,
  })
}

export function useSaveCommitment() {
  return useMoneyMutation(async (input: Partial<FixedCommitment> & { id?: number }) => {
    const { id, ...body } = input

    return id === undefined
      ? (await api.post<FixedCommitment>('/fixed-commitments', body)).data
      : (await api.put<FixedCommitment>(`/fixed-commitments/${id}`, body)).data
  })
}

/** يعلّم السداد **بلا إنشاء عملية** — القرار 12.7. */
export function useMarkCommitmentPaid() {
  return useMoneyMutation(async (input: { id: number; paid: boolean }) =>
    api.post<FixedCommitment>(`/fixed-commitments/${input.id}/mark-paid`, { paid: input.paid }),
  )
}

export function useDeleteCommitment() {
  return useMoneyMutation(async (id: number) => api.delete(`/fixed-commitments/${id}`))
}

// ── الاستثمار والطوارئ ────────────────────────────────────────────────

export function useAutoAllocations() {
  return useQuery({
    queryKey: keys.allocations,
    queryFn: async () => (await api.get<AutoAllocation[]>('/auto-allocations')).data,
  })
}

/** **يُعدَّلان معًا**: مجموع نسب الفائض يجب أن يساوي مئة تمامًا. */
export function useSaveAutoAllocations() {
  return useMoneyMutation(async (body: Record<string, unknown>) =>
    api.put<AutoAllocation[]>('/auto-allocations', body),
  )
}
