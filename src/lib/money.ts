/**
 * المال نصوص عشرية لا أرقام.
 *
 * الخلفية تحسب بالهللة كأعداد صحيحة وتُرجع `"3825.00"`. و`parseFloat` عليها
 * **يعيد خطأ الفاصلة العائمة من الباب الخلفي** بعد أن حُذف من الخلفية كلها.
 *
 * فالقاعدة هنا: المبلغ نص من الخادم إلى الشاشة. وأي حساب في الواجهة يمر
 * بهذه الدوال، وكلها على أعداد صحيحة.
 */

const SUBUNITS = 100n

/** يحوّل نصًّا عشريًا إلى هللات. */
export function toHalalas(amount: string): bigint {
  const trimmed = amount.trim()
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed)

  if (!match) throw new Error(`مبلغ غير صالح: ${amount}`)

  const [, sign, whole, fraction = ''] = match
  const halalas = BigInt(whole) * SUBUNITS + BigInt(fraction.padEnd(2, '0'))

  return sign === '-' ? -halalas : halalas
}

/** ويعيدها نصًّا بخانتين دائمًا. */
export function fromHalalas(halalas: bigint): string {
  const negative = halalas < 0n
  const absolute = negative ? -halalas : halalas

  const whole = absolute / SUBUNITS
  const fraction = (absolute % SUBUNITS).toString().padStart(2, '0')

  return `${negative ? '-' : ''}${whole}.${fraction}`
}

export function addMoney(...amounts: string[]): string {
  return fromHalalas(amounts.reduce((total, a) => total + toHalalas(a), 0n))
}

export function subtractMoney(from: string, amount: string): string {
  return fromHalalas(toHalalas(from) - toHalalas(amount))
}

export function isNegative(amount: string): boolean {
  return toHalalas(amount) < 0n
}

export function isZero(amount: string): boolean {
  return toHalalas(amount) === 0n
}

export function compareMoney(a: string, b: string): number {
  const left = toHalalas(a)
  const right = toHalalas(b)

  return left === right ? 0 : left < right ? -1 : 1
}

/** نسبة مئوية للعرض فقط — لا تُستخدم في أي رقم يُحفظ. */
export function percentOf(part: string, whole: string): number {
  const total = toHalalas(whole)

  if (total === 0n) return 0

  return Number((toHalalas(part) * 10000n) / total) / 100
}

const formatter = new Intl.NumberFormat('ar-SA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * للعرض وحده.
 *
 * يمر بـ`Number` هنا **بعد** أن انتهى كل حساب، فالخطأ لا يتراكم. ولا يُعاد
 * تحليل الناتج ولا يُحفظ.
 */
export function formatMoney(amount: string): string {
  return formatter.format(Number(amount))
}
