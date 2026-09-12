/**
 * تثبيت التطبيق على الشاشة الرئيسية.
 *
 * ## المنصتان تختلفان اختلافًا جوهريًا
 *
 * **أندرويد وسطح المكتب**: المتصفح يطلق `beforeinstallprompt` حين يرى الموقع
 * قابلًا للتثبيت. نمسكه، ونمنع نافذته التلقائية، ونطلقها بزرّنا نحن — فيظهر
 * الطلب حين يختاره المستخدم لا حين يقرر المتصفح.
 *
 * **iOS**: لا حدث ولا واجهة برمجية إطلاقًا. لا سبيل غير أن نشرح الخطوات:
 * زر المشاركة ثم «إضافة إلى الشاشة الرئيسية». ولا نعرض الشرح إلا في Safari
 * على iOS: بقية المتصفحات هناك لا تملك الخيار أصلًا، وعرضه فيها يرسل
 * المستخدم يبحث عن زر غير موجود.
 */

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Platform = 'ios-safari' | 'ios-other' | 'prompt' | 'installed' | 'unsupported'

/** التطبيق مفتوح مثبَّتًا لا في تبويب متصفح؟ */
export function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true

  // خاصية غير قياسية يقرأها Safari وحده، ولا وجود لها في الأنواع.
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isIos(): boolean {
  const ua = navigator.userAgent

  // آيباد بنظام حديث يعرّف نفسه Macintosh، فيُميَّز باللمس.
  const iPadOnDesktopUa = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1

  return /iPad|iPhone|iPod/.test(ua) || iPadOnDesktopUa
}

/**
 * Safari وحده على iOS يملك «إضافة إلى الشاشة الرئيسية».
 *
 * كل متصفحات iOS تبني على WebKit وتذكر Safari في هويتها، فالتمييز يكون
 * باستبعاد هويات المتصفحات الأخرى لا بالبحث عن Safari.
 */
export function isIosSafari(): boolean {
  if (!isIos()) return false

  return !/CriOS|FxiOS|EdgiOS|OPiOS|Brave|DuckDuckGo/.test(navigator.userAgent)
}

export function detectPlatform(saved: InstallPromptEvent | null): Platform {
  if (isStandalone()) return 'installed'
  if (saved !== null) return 'prompt'
  if (isIosSafari()) return 'ios-safari'
  if (isIos()) return 'ios-other'

  return 'unsupported'
}
