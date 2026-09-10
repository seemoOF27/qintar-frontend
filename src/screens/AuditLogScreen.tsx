import { useState } from 'react'
import { useAuditLogs } from '@/api/hooks/useLedger'
import { Card, EmptyState, Select } from '@/components/ui/Primitives'

/** المفاتيح المستقرة من الخادم، مترجمة هنا. لا أسماء أصناف داخلية. */
const entityLabels: Record<string, string> = {
  salary_cycle: 'رحلة راتب',
  extra_income: 'دخل إضافي',
  budget: 'ميزانية',
  budget_snapshot: 'لقطة ميزانية',
  transaction: 'عملية',
  fixed_commitment: 'التزام شهري',
  piggy_bank: 'حصالة',
  auto_allocation: 'صندوق',
  debt: 'دين',
  debt_payment: 'دفعة دين',
  user_card: 'بطاقة',
  tag: 'وسم',
  tag_link: 'ربط وسم',
  consent: 'موافقة',
  bank_sender: 'مصدر رسائل',
  merchant_rule: 'قاعدة تعلّم',
  contact_request: 'رسالة دعم',
  impersonation_request: 'طلب دعم فني',
  verification_code: 'كود تحقق',
  account: 'الحساب',
  unknown: 'غير معروف',
}

const actionLabels: Record<string, string> = {
  created: 'أُنشئ',
  updated: 'عُدّل',
  deleted: 'حُذف',
  restored: 'استُعيد',
}

export function AuditLogScreen() {
  const [entity, setEntity] = useState('')
  const { data, isPending } = useAuditLogs(entity === '' ? {} : { entity })

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <h1 className="text-[length:var(--text-title)] font-semibold">السجل</h1>
        <Select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-auto">
          <option value="">كل شيء</option>
          {Object.entries(entityLabels)
            .filter(([key]) => key !== 'unknown')
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </Select>
      </div>

      {isPending && <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>}
      {data !== undefined && data.length === 0 && <EmptyState title="ما فيه شيء في السجل بعد." />}

      {(data ?? []).map((entry) => (
        <Card key={entry.id}>
          <div className="flex items-baseline justify-between gap-[var(--space-2)]">
            <span>
              {actionLabels[entry.action] ?? entry.action}{' '}
              {entityLabels[entry.entity] ?? entry.entity}
            </span>
            <span className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
              {new Date(entry.created_at).toLocaleString('ar-SA')}
            </span>
          </div>

          {entry.changed_fields.length > 0 && (
            <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
              الحقول: {entry.changed_fields.join('، ')}
            </p>
          )}

          {entry.is_impersonated && (
            <p className="mt-[var(--space-1)] text-[length:var(--text-caption)] text-[color:var(--color-state-warning)]">
              جرى أثناء جلسة دعم فني وافقت عليها.
            </p>
          )}
        </Card>
      ))}
    </div>
  )
}
