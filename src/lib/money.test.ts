import { describe, expect, it } from 'vitest'
import { addMoney, compareMoney, fromHalalas, subtractMoney, toHalalas } from './money'

describe('المال نصوص لا أرقام', () => {
  it('يجمع هللة ألف مرة فيعطي عشرة ريالات بالضبط', () => {
    let total = '0.00'

    for (let i = 0; i < 1000; i++) total = addMoney(total, '0.01')

    expect(total).toBe('10.00')
  })

  it('لا يفقد الدقة حيث تفقدها الفاصلة العائمة', () => {
    // 0.1 + 0.2 === 0.30000000000000004 بالفاصلة العائمة
    expect(addMoney('0.10', '0.20')).toBe('0.30')
  })

  it('يحفظ الأصفار الزائدة', () => {
    expect(fromHalalas(toHalalas('3825'))).toBe('3825.00')
    expect(fromHalalas(toHalalas('0.05'))).toBe('0.05')
  })

  it('يطرح ويقارن بلا انحراف', () => {
    expect(subtractMoney('3825.00', '3000.00')).toBe('825.00')
    expect(compareMoney('100.01', '100.02')).toBe(-1)
    expect(compareMoney('100.01', '100.01')).toBe(0)
  })

  it('يرفض ما ليس مبلغًا', () => {
    expect(() => toHalalas('كثير')).toThrow()
    expect(() => toHalalas('1.005')).toThrow()
  })
})
