import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '@/api/client'
import { draftQueue, type Draft } from './queue'
import { supportSession } from '@/lib/supportSession'

/**
 * يرفع المسودات حين تعود الشبكة.
 *
 * **لا يعيد المحاولة إلى الأبد صامتًا.** مسودة يرفضها الخادم لخطأ في
 * بياناتها تبقى في الطابور معلَّمة بسببها، ليصلحها المستخدم أو يحذفها —
 * فمحاولة صامتة متكررة تُخفي أن شيئًا لم يُحفظ.
 */
export function useDraftSync() {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Draft[]>(() => draftQueue.all())

  const refresh = useCallback(() => setDrafts(draftQueue.all()), [])

  /*
   * **حالة المزامنة من `useMutation` لا من `useState`.** كانت `setIsSyncing`
   * تُستدعى متزامنة داخل التأثير عند الإقلاع، فترسم الشاشة مرتين. والطفرة
   * تحمل «جارية» بنفسها، ولا تبدأ مزامنة ثانية فوق جارية.
   */
  const mutation = useMutation({
    mutationFn: async () => {
      for (const draft of draftQueue.all().filter((item) => item.lastError === undefined)) {
        try {
          await api.post('/transactions', draft.payload)
          draftQueue.remove(draft.localId)
        } catch (error) {
          if (error instanceof ApiError && error.isValidation) {
            // خطأ في البيانات نفسها: لا تُعاد المحاولة، تُعرض للمستخدم.
            draftQueue.markFailed(draft.localId, error.message)
          }
          // خطأ شبكة: تبقى في الطابور بلا علامة، وتُجرَّب لاحقًا.
          break
        }
      }
    },
    onSettled: () => {
      refresh()
      void queryClient.invalidateQueries()
    },
  })

  const { mutate, isPending } = mutation

  const sync = useCallback(() => {
    // **لا مزامنة داخل جلسة دعم.** الطابور في `localStorage` مشترك بين
    // التبويبات، فمسودات موظف الدعم الشخصية كانت ستُرفع لحساب المستخدم.
    if (supportSession.isActive()) return

    const pending = draftQueue.all().filter((draft) => draft.lastError === undefined)

    if (pending.length === 0 || !navigator.onLine) return

    mutate()
  }, [mutate])

  useEffect(() => {
    window.addEventListener('online', sync)
    sync()

    return () => window.removeEventListener('online', sync)
  }, [sync])

  return {
    drafts,
    isSyncing: isPending,
    sync,
    discard: (localId: string) => {
      draftQueue.remove(localId)
      refresh()
    },
  }
}
