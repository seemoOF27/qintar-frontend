import { createContext, useContext } from 'react'

/**
 * إخفاء الأرقام — السياق والخطّاف.
 *
 * منفصلان عن `PrivacyContext.tsx` لأن ملفًّا يصدّر مكوّنًا وخطّافًا معًا
 * يكسر التحديث السريع في Vite: تعديلٌ على المكوّن يعيد تحميل الصفحة كلها.
 *
 * **واسمه `usePrivacyDisplay` لا `usePrivacy`**: الثاني خطّاف لوحة الخصوصية
 * في `api/hooks/usePrivacy.ts`، واسمان متطابقان لشيئين مختلفين يُستورد
 * أحدهما مكان الآخر.
 */
export interface PrivacyDisplayValue {
  hidden: boolean
  toggle: () => void
}

export const PrivacyDisplayContext = createContext<PrivacyDisplayValue>({ hidden: false, toggle: () => {} })

export function usePrivacyDisplay(): PrivacyDisplayValue {
  return useContext(PrivacyDisplayContext)
}
