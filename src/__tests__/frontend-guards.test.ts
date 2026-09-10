import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * حُرّاس قواعد الواجهة.
 *
 * كلها قواعد مكتوبة في `CLAUDE.md`، وقاعدة لا يفرضها اختبار تُنسى بعد شهرين.
 */

function sourceFiles(dir = 'src'): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) return sourceFiles(full)

    return /\.(ts|tsx)$/.test(full) && !full.includes('__tests__') ? [full] : []
  })
}

describe('لا Hex مباشر في أي مكوّن', () => {
  it('كل لون يمر بتوكن من shared/design-tokens.json', () => {
    const offences: string[] = []

    for (const file of sourceFiles()) {
      const lines = readFileSync(file, 'utf8').split('\n')

      lines.forEach((line, index) => {
        // نتجاهل التعليقات: الشرح قد يذكر قيمة لتوضيح القاعدة.
        if (/^\s*(\*|\/\/)/.test(line)) return

        if (/#[0-9A-Fa-f]{6}\b/.test(line)) {
          offences.push(`${file}:${index + 1}`)
        }
      })
    }

    expect(offences, `Hex مباشر — القسم 13 يمنعه:\n${offences.join('\n')}`).toEqual([])
  })
})

describe('المال نصوص لا أرقام', () => {
  it('لا parseFloat ولا Number على مبلغ في طبقة البيانات', () => {
    const offences: string[] = []

    for (const file of sourceFiles()) {
      // `formatMoney` وحدها تحوّل، وبعد أن ينتهي كل حساب.
      if (file.endsWith('lib/money.ts')) continue

      const lines = readFileSync(file, 'utf8').split('\n')

      lines.forEach((line, index) => {
        if (/^\s*(\*|\/\/)/.test(line)) return

        if (/parseFloat\s*\(|parseInt\s*\(\s*\w*[Aa]mount/.test(line)) {
          offences.push(`${file}:${index + 1}`)
        }
      })
    }

    expect(
      offences,
      `تحويل مبلغ إلى رقم يعيد خطأ الفاصلة العائمة:\n${offences.join('\n')}`,
    ).toEqual([])
  })
})

describe('لا مراقبة أخطاء بلا موافقة', () => {
  it('حزمة المراقبة غير مستوردة أصلًا', () => {
    const offences: string[] = []

    for (const file of sourceFiles()) {
      const content = readFileSync(file, 'utf8')

      if (/from\s+['"]@sentry\//.test(content)) offences.push(file)
    }

    expect(
      offences,
      'القاعدة الرابعة: لا غرض بلا موافقة سارية، وعدم التحميل أقوى من تهيئة معطّلة.',
    ).toEqual([])
  })

  it('ولا هي في اعتماديات المشروع', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>
    }

    const sentry = Object.keys(pkg.dependencies ?? {}).filter((name) => name.startsWith('@sentry/'))

    expect(sentry).toEqual([])
  })
})

describe('الجوال أولًا', () => {
  it('يستخدم 100dvh لا 100vh', () => {
    const offences: string[] = []

    for (const file of sourceFiles()) {
      const lines = readFileSync(file, 'utf8').split('\n')

      lines.forEach((line, index) => {
        if (/^\s*(\*|\/\/)/.test(line)) return
        if (/\b100vh\b|\bh-screen\b|\bmin-h-screen\b/.test(line)) offences.push(`${file}:${index + 1}`)
      })
    }

    expect(
      offences,
      `100vh يحسب شريط المتصفح المتحرك فتُقصّ الشاشة على الجوال:\n${offences.join('\n')}`,
    ).toEqual([])
  })

  it('حجم الخط في الحقول لا ينزل عن 16px', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8')

    expect(css).toContain('font-size: max(16px, 1rem)')
  })
})

describe('نصوص الموافقة مطابقة للخلفية', () => {
  it('كل نص في shared/consent موجود حرفيًا في ملفات الخلفية', () => {
    const backendDir = '../api/resources/consent'

    for (const file of readdirSync('shared/consent')) {
      const ours = readFileSync(join('shared/consent', file), 'utf8')
      const theirs = readFileSync(join(backendDir, file), 'utf8')

      expect(ours, `نص ${file} تباعد عن الخلفية — الهاش المخزَّن يوثّق نصًّا غير المعروض.`).toBe(
        theirs,
      )
    }
  })
})
