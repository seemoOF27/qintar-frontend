/**
 * يفتح الواجهة على **جوالك** من متصفحه، على نفس شبكة Wi-Fi.
 *
 * الوكيل في `vite.config.ts` يوصل `/api` بالخلفية على الماك، فالخادم لا يحتاج
 * أن يستمع على كل الواجهات. **وحدود العنوان المحلي:** بلا https لا يعمل عامل
 * الخدمة، فالتثبيت على الشاشة الرئيسية والعمل بلا إنترنت يحتاجان النفق —
 * `docs/deploy.md`.
 */
import { networkInterfaces } from 'node:os'
import { spawn } from 'node:child_process'

const port = process.env.WEB_PORT ?? '5173'

const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find((entry) => entry?.family === 'IPv4' && !entry.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(entry.address))
  ?.address

if (lanAddress === undefined) {
  console.error('ما لقيت عنوان شبكة محلية. تأكد أن الماك متصل بـWi-Fi.')
  process.exit(1)
}

console.log(`\nافتح على الجوال: http://${lanAddress}:${port}`)
console.log('والخادم يعمل على الماك بـ: php artisan serve')
console.log('للتثبيت على الشاشة الرئيسية استخدم النفق بدل هذا العنوان — docs/deploy.md\n')

spawn('npx', ['vite', '--host', '--port', port, '--strictPort'], { stdio: 'inherit' })
