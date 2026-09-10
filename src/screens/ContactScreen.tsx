import { Card, Notice } from '@/components/ui/Primitives'

/**
 * تواصل معنا.
 *
 * الشاشة قائمة، والمسار في الخلفية يُبنى في المرحلة العاشرة مع لوحة
 * الخصوصية. ولا تُعرض للمستخدم ميزة توحي بأنها تعمل وهي لا تعمل.
 */
export function ContactScreen() {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">تواصل معنا</h1>

      <Notice tone="info">
        هذي الشاشة تُفعَّل مع لوحة الخصوصية في مرحلة قادمة. **ما نعرض زرًّا يوهم أنه يعمل.**
      </Notice>

      <Card>
        <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
          حتى ذلك الحين، بياناتك المالية كلها على خادمك ولا تغادره. وتقدر تشوف كل ما جرى على
          حسابك من شاشة السجل.
        </p>
      </Card>
    </div>
  )
}
