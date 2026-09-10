import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { CategorySuggestion, ParseRequest } from '@/api/types'
import { keys } from './keys'

/**
 * التحليل الذكي — **طابور واستطلاع ومؤشر مرئي**.
 *
 * القاعدة الخامسة: هذا المسار يرسل بيانات مالية لطرف ثالث. فالواجهة تُظهر
 * ذلك صراحةً في كل خطوة — «يُرسل للتحليل…» ثم اسم المزوّد الذي عالجها —
 * ولا تعرض شيئًا يوحي بأن المعالجة محلية.
 *
 * ورفض الموافقة **ليس عطلًا**: الفورم اليدوي تحته يعمل كاملًا.
 */

/** فاصل الاستطلاع: قصير كفاية ليبدو حيًّا، طويل كفاية لئلا يُغرق الخادم. */
const POLL_MS = 1500

/**
 * سقف عدد الاستطلاعات قبل الاستسلام، فلا يدور المؤشر إلى الأبد.
 *
 * عدد لا مهلة زمنية: العدّ يأتي من حالة الاستعلام نفسها، فلا يُقرأ وقتٌ
 * أثناء الرسم — قراءةٌ تجعل نتيجة الدالة تتغير بلا تغيّر مدخلاتها.
 */
const POLL_LIMIT = 60

export function useParseMessage() {
  return useMutation({
    mutationFn: async (text: string) =>
      (await api.post<ParseRequest>('/transactions/parse-sms', { text })).data,
  })
}

export function useParseReceipt() {
  return useMutation({
    mutationFn: async (file: File) =>
      (await api.upload<ParseRequest>('/transactions/parse-receipt', 'receipt', file)).data,
  })
}

/**
 * يستطلع طلبًا حتى ينتهي.
 *
 * يتوقف عند `completed` أو `failed` — وعند تجاوز السقف الزمني، فطابور
 * متعطل لا يبرره استطلاع أبدي.
 */
export function useParseRequest(id: number | null) {
  return useQuery({
    queryKey: keys.parseRequest(id ?? 0),
    enabled: id !== null,
    queryFn: async () => (await api.get<ParseRequest>(`/transactions/parse-requests/${id}`)).data,
    refetchInterval: (query) => {
      const status = query.state.data?.status

      if (status === 'completed' || status === 'failed') return false
      if (query.state.dataUpdateCount >= POLL_LIMIT) return false

      return POLL_MS
    },
  })
}

/**
 * تصنيف مقترَح لاسم تاجر — **يُعرض ويؤكده المستخدم**، القسم ٥.٤.
 *
 * لا يُطبَّق تلقائيًا في أي حال، ولا حتى بثقة عالية.
 */
export function useCategorySuggestion(merchantName: string) {
  const trimmed = merchantName.trim()

  return useQuery({
    queryKey: keys.categorySuggestion(trimmed),
    enabled: trimmed.length > 1,
    queryFn: async () =>
      (
        await api.get<{ suggestion: CategorySuggestion | null }>('/transactions/suggest-category', {
          merchant_name: trimmed,
        })
      ).data.suggestion,
  })
}
