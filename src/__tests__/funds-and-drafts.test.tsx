import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { draftQueue } from '@/lib/offline/queue'
import { useDraftSync } from '@/lib/offline/useDraftSync'
import { FundsScreen } from '@/screens/FundsScreen'

/**
 * خللان سلوكيان أظهرهما تنظيف تحذيرات المدقق — لا تحذيران شكليان.
 */

const ok = (data: unknown) => new Response(JSON.stringify({ success: true, message: null, errors: null, data }))

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('الاستثمار والطوارئ', () => {
  /** النموذج يبدأ بقيم الخادم لا بالافتراضية ثم يقفز. */
  it('يبدأ بقيم الخادم', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok([
      { type: 'investment', method: 'fixed', value: '1500.00', current_balance: '0.00', surplus_share_percentage: '70.00' },
      { type: 'emergency', method: 'percentage', value: '5.00', current_balance: '0.00', surplus_share_percentage: '30.00' },
    ])))

    const Wrapper = wrapper()
    render(<Wrapper><FundsScreen /></Wrapper>)

    expect(await screen.findByDisplayValue('1500.00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('70.00')).toBeInTheDocument()
  })

  /**
   * **ما كتبه المستخدم لا يُمحى** حين يُعاد جلب البيانات بعد الحفظ.
   * كان التأثير يكتب قيم الخادم فوق النموذج مع كل جلب.
   */
  it('الكتابة لا تُمحى بإعادة جلب', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok([])))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><FundsScreen /></QueryClientProvider>)

    const inputs = await screen.findAllByDisplayValue('50.00')
    fireEvent.change(inputs[0], { target: { value: '65' } })

    await client.invalidateQueries()
    await waitFor(() => expect(screen.getByDisplayValue('65')).toBeInTheDocument())
  })
})

describe('مزامنة المسودات', () => {
  it('ترفع المسودات عند الإقلاع وتبلّغ انتهاءها', async () => {
    draftQueue.add({ amount: '45.00', merchant_name: 'بقالة' })
    const fetchMock = vi.fn(async () => ok({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useDraftSync(), { wrapper: wrapper() })

    await waitFor(() => expect(draftQueue.all()).toHaveLength(0))
    await waitFor(() => expect(result.current.isSyncing).toBe(false))
    expect(result.current.drafts).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  /** مسودة يرفضها الخادم لخطأ في بياناتها تبقى معلَّمة، ولا تُعاد صامتة. */
  it('خطأ التحقق يُعلَّم ولا يُعاد', async () => {
    draftQueue.add({ amount: 'x' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, message: 'المبلغ غير صالح', data: null, errors: { amount: ['x'] } }), { status: 422 })))

    const { result } = renderHook(() => useDraftSync(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.drafts[0]?.lastError).toBe('المبلغ غير صالح'))
  })
})
