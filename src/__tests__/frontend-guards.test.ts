import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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

describe('الأسرار لا تُخزَّن في المتصفح', () => {
  /**
   * كلمة مرور التصدير **لحظية**: تُكتب وتُستعمل وتُنسى.
   *
   * قرارك في §١٥ من 0005 يقوم على أن التصدير اليدوي لا يخزّن شيئًا. تخزينها
   * في المتصفح «تسهيلًا» يبطل ذلك بلا أن يظهر في أي شاشة.
   */
  it('لا كلمة مرور تُكتب في localStorage ولا sessionStorage', () => {
    const offences: string[] = []

    for (const file of sourceFiles()) {
      const lines = readFileSync(file, 'utf8').split('\n')

      lines.forEach((line, index) => {
        if (/^\s*(\*|\/\/)/.test(line)) return

        if (/(local|session)Storage\.setItem\([^)]*[Pp]assword/.test(line)) {
          offences.push(`${file}:${index + 1}`)
        }
      })
    }

    expect(offences, `كلمة مرور مخزَّنة في المتصفح:\n${offences.join('\n')}`).toEqual([])
  })
})

describe('سحب الموافقة بنفس سهولة منحها', () => {
  /**
   * `compliance/consent-model.md`: «لا يُطلب سبب، ولا تُعرض شاشة إقناع، ولا
   * يُصعَّب المسار». وأشهر صور التصعيب `confirm()` على الإيقاف وحده.
   */
  it('لا نافذة تأكيد في شاشة الخصوصية', () => {
    const source = readFileSync('src/screens/PrivacyScreen.tsx', 'utf8')

    expect(source).not.toMatch(/window\.confirm|\bconfirm\(/)
  })
})

describe('تقارير الأعطال لا تحمل بيانات', () => {
  /**
   * حدُّ الأعطال يرسل **صنف الخطأ واسم الشاشة** لا غير.
   *
   * `error.message` قد تحمل مبلغًا، و`componentStack` يحمل شجرة المكوّنات
   * بخصائصها. والخادم يرفض ما عدا الحقلين أصلًا، وهذا الحارس يمسك المحاولة
   * قبل أن تصل إليه.
   */
  it('حدّ الأعطال لا يرسل رسالة ولا أثر مكدس', () => {
    const source = readFileSync('src/components/ErrorBoundary.tsx', 'utf8')

    // التعليقات تُطرح: الشرح يذكر الحقول الممنوعة ليقول لماذا مُنعت.
    const sending = source
      .slice(source.indexOf('componentDidCatch'), source.indexOf('render()'))
      .split('\n')
      .filter((line) => !/^\s*(\*|\/\/)/.test(line))
      .join('\n')

    expect(sending).not.toMatch(/error\.message/)
    expect(sending).not.toMatch(/error\.stack/)
    expect(sending).not.toMatch(/componentStack/)
    expect(sending).toMatch(/error\.name/)
  })

  it('ولا تقرير يذهب لغير خادمنا', () => {
    const offences: string[] = []

    for (const file of sourceFiles()) {
      const lines = readFileSync(file, 'utf8').split('\n')

      lines.forEach((line, index) => {
        if (/^\s*(\*|\/\/)/.test(line)) return

        // كل نداء شبكة يمر بـ`api` أو بمسار نسبي تحت /api/v1.
        if (/fetch\(\s*['"`]https?:\/\//.test(line)) offences.push(`${file}:${index + 1}`)
      })
    }

    expect(offences, `نداء شبكة لعنوان خارجي:\n${offences.join('\n')}`).toEqual([])
  })
})

describe('التطبيق قابل للتثبيت', () => {
  const config = readFileSync('vite.config.ts', 'utf8')
  const html = readFileSync('index.html', 'utf8')

  /**
   * **لا استجابة API في الكاش.**
   *
   * رصيدٌ قديم يُعرض كأنه اليوم أخطر من رصيد لا يُعرض: من لا يرى رقمًا يعرف
   * أنه لا يرى، ومن يرى رقمًا قديمًا يبني عليه قرارًا.
   */
  it('مسارات API خارج التخزين المؤقت', () => {
    expect(config).toMatch(/navigateFallbackDenylist/)
    expect(config).toMatch(/NetworkOnly/)
    expect(config).toMatch(/\/api\//)
  })

  /** iOS يتجاهل أيقونات الـmanifest ويقرأ هذا الوسم وحده. */
  it('أيقونة iOS موجودة وPNG لا SVG', () => {
    expect(html).toMatch(/rel="apple-touch-icon"[^>]*\.png/)
    expect(existsSync('public/icons/apple-touch-icon.png')).toBe(true)
  })

  /** بلا هذا الوسم يفتح iOS التطبيق بشريط عنوان كأنه صفحة. */
  it('وسم فتح التطبيق بلا شريط متصفح موجود', () => {
    expect(html).toMatch(/name="apple-mobile-web-app-capable"\s+content="yes"/)
  })

  /** قناع أندرويد يقصّ الدائرة، فيلزم أيقونة بمنطقة آمنة. */
  it('أيقونة maskable موجودة', () => {
    expect(config).toMatch(/purpose:\s*'maskable'/)
    expect(existsSync('public/icons/icon-maskable-512.png')).toBe(true)
  })

  /** الصفحة عربية RTL من الجذر لا بـCSS. */
  it('الجذر عربي واتجاهه من اليمين', () => {
    expect(html).toMatch(/<html lang="ar" dir="rtl">/)
  })

  /** `viewport-fit=cover` مع الحواف الآمنة، وإلا اختفى التنقّل خلف الإيماءة. */
  it('الشاشة تمتد تحت الحواف الآمنة', () => {
    expect(html).toMatch(/viewport-fit=cover/)
    expect(readFileSync('src/components/AppShell.tsx', 'utf8')).toMatch(/safe-area-inset-top/)
    expect(readFileSync('src/components/AppShell.tsx', 'utf8')).toMatch(/safe-area-inset-bottom/)
  })

  /** التكبير لا يُعطَّل: تعطيله يمنع من يحتاجه. */
  it('تكبير الصفحة غير معطَّل', () => {
    expect(html).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/)
  })
})
