import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * إخفاء الأرقام الحسّاسة.
 *
 * **إخفاء بصري لا تشفير** — القسم ٨. حالة واجهة وتفضيل محلي، ولا يُوصف
 * للمستخدم بغير ذلك.
 *
 * ونطاقه: **الراتب والفائض والمتبقي وإجمالي الميزانيات**. أما الميزانيات
 * نفسها فتبقى ظاهرة دائمًا — إخفاؤها يجعل الشاشة بلا فائدة.
 */
const STORAGE_KEY = 'qintar.hideFigures'

interface PrivacyValue {
  hidden: boolean
  toggle: () => void
}

const PrivacyContext = createContext<PrivacyValue>({ hidden: false, toggle: () => {} })

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0')
    } catch {
      /* متصفح يمنع التخزين: التفضيل يبقى للجلسة وحدها */
    }
  }, [hidden])

  const toggle = useCallback(() => setHidden((value) => !value), [])
  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle])

  return <PrivacyContext value={value}>{children}</PrivacyContext>
}

export function usePrivacy(): PrivacyValue {
  return useContext(PrivacyContext)
}
