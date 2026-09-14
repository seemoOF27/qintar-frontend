import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { PrivacyProvider } from '@/context/PrivacyContext'
import { App } from '@/App'
import { ApiError } from '@/api/client'
import { keys } from '@/api/hooks/keys'
import './styles/tokens.css'

/**
 * **لا مكتبة مراقبة أخطاء محمَّلة هنا.**
 *
 * القاعدة الرابعة: لا غرض بلا موافقة سارية. و`error_monitoring` مطفأة
 * افتراضيًا، فالحزمة **لا تُستورد أصلًا** — عدم التحميل أقوى من تهيئة
 * معطّلة يسهو أحد عن شرطها.
 */
/**
 * **تغيّرت السياسة أثناء الجلسة.**
 *
 * الخادم يبدأ برفض كل شيء بـ403، والواجهة ما زالت تحمل مستخدمًا قديمًا يقول
 * إنه قبل. فأي رفضٍ يحمل العلامة يُعيد جلب الحساب، فتظهر شاشة القبول بدل
 * سيلٍ من رسائل «ممنوع» لا تشرح نفسها.
 */
function refreshOnPolicyChange(error: unknown): void {
  if (error instanceof ApiError && error.policyAcceptanceRequired) {
    void queryClient.invalidateQueries({ queryKey: keys.me })
  }
}

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: refreshOnPolicyChange }),
  mutationCache: new MutationCache({ onError: refreshOnPolicyChange }),
  defaultOptions: {
    queries: {
      // أرقام مالية: لا تُعرض قديمة بلا إعادة تحقق.
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PrivacyProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PrivacyProvider>
    </QueryClientProvider>
  </StrictMode>,
)
