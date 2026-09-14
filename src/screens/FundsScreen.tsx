import { useState } from 'react'
import type { AutoAllocation } from '@/api/types'
import { useAutoAllocations, useSaveAutoAllocations } from '@/api/hooks/useMoneyResources'
import { Money } from '@/components/ui/Money'
import { Button, Card, Field, MoneyInput, Notice, Select } from '@/components/ui/Primitives'
import { ApiError } from '@/api/client'
import { addMoney } from '@/lib/money'

/**
 * الاستثمار والطوارئ.
 *
 * **يُعدَّلان معًا في طلب واحد**: مجموع نسب توزيع الفائض يجب أن يساوي مئة
 * تمامًا. تعديل صندوق وحده يترك المجموع خاطئًا بين الطلبين، فلو أُقفلت رحلة
 * في تلك اللحظة قُسّم الفائض خطأً.
 *
 * والمجموع يُتحقق هنا وفي الخادم معًا: هنا للراحة، وهناك للفرض.
 */
export function FundsScreen() {
  const { data, isPending } = useAutoAllocations()

  if (isPending) return <p className="text-[color:var(--color-ink-muted)]">لحظة…</p>

  return <FundsForm data={data ?? []} />
}

/** قيم النموذج من الخادم، أو الافتراضية لمن لم يحفظ بعد. */
function formFrom(data: AutoAllocation[]) {
  const find = (type: string) => data.find((row) => row.type === type)
  const investment = find('investment')
  const emergency = find('emergency')

  return {
    investment: {
      method: investment?.method ?? 'percentage',
      value: investment?.value ?? '10.00',
      surplus_share_percentage: investment?.surplus_share_percentage ?? '50.00',
    },
    emergency: {
      method: emergency?.method ?? 'percentage',
      value: emergency?.value ?? '5.00',
      surplus_share_percentage: emergency?.surplus_share_percentage ?? '50.00',
    },
  }
}

/**
 * النموذج يُنشأ **بعد** وصول البيانات، فيبدأ بقيمها.
 *
 * كان يبدأ بقيم افتراضية ثم ينسخ البيانات في تأثير حين تصل — فمن كتب رقمًا
 * قبل وصولها يُمحى ما كتبه بلا إشعار، وكل حفظ يعيد جلبًا يعيد الكتابة فوق
 * النموذج.
 */
function FundsForm({ data }: { data: AutoAllocation[] }) {
  const save = useSaveAutoAllocations()
  const [form, setForm] = useState(() => formFrom(data))

  const error = save.error instanceof ApiError ? save.error : null

  let shareTotal = '0.00'
  let totalValid = false

  try {
    shareTotal = addMoney(
      form.investment.surplus_share_percentage || '0',
      form.emergency.surplus_share_percentage || '0',
    )
    totalValid = shareTotal === '100.00'
  } catch {
    totalValid = false
  }

  const balanceOf = (type: string) => data.find((row) => row.type === type)?.current_balance ?? '0.00'

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <h1 className="text-[length:var(--text-title)] font-semibold">الاستثمار والطوارئ</h1>

      <div className="grid grid-cols-2 gap-[var(--space-3)]">
        <Card>
          <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
            رصيد الاستثمار
          </p>
          <Money amount={balanceOf('investment')} sensitive size="title" />
        </Card>
        <Card>
          <p className="text-[length:var(--text-caption)] text-[color:var(--color-ink-muted)]">
            رصيد الطوارئ
          </p>
          <Money amount={balanceOf('emergency')} sensitive size="title" />
        </Card>
      </div>

      <Card>
        <form
          className="flex flex-col gap-[var(--space-4)]"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate(form)
          }}
        >
          {(['investment', 'emergency'] as const).map((type) => (
            <fieldset key={type} className="flex flex-col gap-[var(--space-2)]">
              <legend className="mb-[var(--space-1)] font-semibold">
                {type === 'investment' ? 'الاستثمار' : 'الطوارئ'}
              </legend>

              <Field label="طريقة الاقتطاع">
                <Select
                  value={form[type].method}
                  onChange={(e) =>
                    setForm({ ...form, [type]: { ...form[type], method: e.target.value } })
                  }
                >
                  <option value="percentage">نسبة من الراتب</option>
                  <option value="fixed">مبلغ ثابت</option>
                </Select>
              </Field>

              <Field label={form[type].method === 'percentage' ? 'النسبة' : 'المبلغ'}>
                <MoneyInput
                  value={form[type].value}
                  onChange={(e) =>
                    setForm({ ...form, [type]: { ...form[type], value: e.target.value } })
                  }
                  required
                />
              </Field>

              <Field label="حصته من الفائض">
                <MoneyInput
                  value={form[type].surplus_share_percentage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [type]: { ...form[type], surplus_share_percentage: e.target.value },
                    })
                  }
                  required
                />
              </Field>
            </fieldset>
          ))}

          <Notice tone={totalValid ? 'positive' : 'warning'}>
            مجموع حصص الفائض: {shareTotal}٪
            {totalValid ? ' ✓' : ' — لا بد أن يساوي ١٠٠٪ بالضبط.'}
          </Notice>

          {error !== null && <Notice tone="danger">{error.message}</Notice>}

          <Button type="submit" disabled={!totalValid || save.isPending}>
            احفظ الاثنين
          </Button>
        </form>
      </Card>
    </div>
  )
}
