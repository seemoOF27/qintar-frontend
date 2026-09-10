import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '@/api/client'
import { draftQueue, type Draft } from './queue'

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
  const [isSyncing, setIsSyncing] = useState(false)

  const refresh = useCallback(() => setDrafts(draftQueue.all()), [])

  const sync = useCallback(async () => {
    const pending = draftQueue.all().filter((draft) => draft.lastError === undefined)

    if (pending.length === 0 || !navigator.onLine) return

    setIsSyncing(true)

    for (const draft of pending) {
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

    setIsSyncing(false)
    refresh()
    void queryClient.invalidateQueries()
  }, [queryClient, refresh])

  useEffect(() => {
    const onOnline = () => void sync()

    window.addEventListener('online', onOnline)
    void sync()

    return () => window.removeEventListener('online', onOnline)
  }, [sync])

  return {
    drafts,
    isSyncing,
    sync,
    discard: (localId: string) => {
      draftQueue.remove(localId)
      refresh()
    },
  }
}
