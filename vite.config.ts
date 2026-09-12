import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * إعداد الواجهة.
 *
 * ## التطبيق يُثبَّت لا يُفتح من المتصفح وحده
 *
 * نفس الشيفرة تعمل في المتصفح وعلى الشاشة الرئيسية في iOS وأندرويد. لا نسخة
 * ثانية تتباعد عن الأولى.
 *
 * ## واستجابات الـAPI **لا تُخزَّن أبدًا**
 *
 * رصيدٌ قديم يُعرض كأنه اليوم أخطر من رصيد لا يُعرض. المستخدم الذي لا يرى
 * رقمًا يعرف أنه لا يرى؛ والذي يرى رقمًا قديمًا يبني عليه قرارًا.
 *
 * فالتخزين للقشرة وحدها — HTML وJS وCSS والخطوط والأيقونات — وكل ما تحت
 * `/api/` يمر للشبكة أو يفشل.
 */
export default defineConfig({
  /*
   * الواجهة تنادي `/api/v1` **نسبيًّا** لا بعنوان مطلق، فتعمل خلف نفس الأصل
   * في الإنتاج بلا CORS إطلاقًا. وفي التطوير يوصلها هذا الوكيل بالخادم.
   *
   * وميزة عملية: النفق يحمل أصلًا واحدًا فيعمل الويب والـPWA من عنوان واحد،
   * وiOS لا يثبّت تطبيقًا من أصلين.
   */
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],

      manifest: {
        name: 'قنطار — إدارة الراتب',
        short_name: 'قنطار',
        description: 'راتبك وميزانياتك ومصروفاتك في مكان واحد.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#1F6F5C',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'إضافة مصروف', short_name: 'مصروف', url: '/add' },
          { name: 'الإحصائيات', short_name: 'إحصائيات', url: '/statistics' },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],

        // **لا استجابة API في الكاش.** يُستثنى المسار كله قبل أي قاعدة أخرى.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },

      devOptions: {
        // معطّل في التطوير: عامل خدمة يخزّن أثناء العمل يخفي تعديلاتك.
        enabled: false,
      },
    }),
  ],
})
