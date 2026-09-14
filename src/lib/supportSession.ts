/**
 * جلسة الدعم الفني داخل تطبيق الويب.
 *
 * ## `sessionStorage` لا `localStorage`
 *
 * تبويب الجلسة يفتحه موظف الدعم **في متصفحه هو** — وقد يكون داخلًا تطبيق
 * الويب بحسابه الشخصي في تبويب آخر. `localStorage` مشترك بين تبويبات الأصل
 * الواحد، فرمز الجلسة هناك يستبدل رمز الموظف في كل تبويباته. و
 * `sessionStorage` للتبويب وحده، ويُمحى بإغلاقه.
 *
 * ## وما يُعطَّل داخل الجلسة في الواجهة
 *
 * **طابور المسودات بلا إنترنت** مشترك في `localStorage` كذلك. بلا تعطيله
 * كانت مسودات الموظف الشخصية تُرفع **إلى حساب المستخدم** برمز الجلسة.
 */

const TOKEN = 'qintar.support.token'
const EXPIRES = 'qintar.support.expires'
const REQUEST = 'qintar.support.request'

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export const supportSession = {
  token(): string | null {
    const token = read(TOKEN)
    const expires = read(EXPIRES)

    // منتهية: تُمحى هنا فلا يُرسل رمزٌ يعرف الخادم أنه ميت.
    if (token !== null && expires !== null && Date.parse(expires) <= Date.now()) {
      supportSession.clear()

      return null
    }

    return token
  },

  isActive(): boolean {
    return supportSession.token() !== null
  },

  expiresAt(): Date | null {
    const value = read(EXPIRES)

    return value === null ? null : new Date(value)
  },

  requestId(): number | null {
    const value = read(REQUEST)

    return value === null ? null : Number(value)
  },

  start(token: string, expiresAt: string, requestId: number): void {
    try {
      sessionStorage.setItem(TOKEN, token)
      sessionStorage.setItem(EXPIRES, expiresAt)
      sessionStorage.setItem(REQUEST, String(requestId))
    } catch {
      /* متصفح يمنع التخزين: الجلسة لا تبدأ، والشاشة تقول ذلك */
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(TOKEN)
      sessionStorage.removeItem(EXPIRES)
      sessionStorage.removeItem(REQUEST)
    } catch {
      /* تجاهل */
    }
  },
}
