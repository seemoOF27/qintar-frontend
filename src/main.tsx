import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { PrivacyProvider } from '@/context/PrivacyContext'
import { App } from '@/App'
import './styles/tokens.css'

/**
 * **لا مكتبة مراقبة أخطاء محمَّلة هنا.**
 *
 * القاعدة الرابعة: لا غرض بلا موافقة سارية. و`error_monitoring` مطفأة
 * افتراضيًا، فالحزمة **لا تُستورد أصلًا** — عدم التحميل أقوى من تهيئة
 * معطّلة يسهو أحد عن شرطها.
 */
const queryClient = new QueryClient({
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
