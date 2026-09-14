import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, getToken, setToken } from '@/api/client'
import { supportSession } from '@/lib/supportSession'
import { draftQueue } from '@/lib/offline/queue'
import { SupportSessionScreen } from '@/screens/SupportSessionScreen'

/**
 * جلسة الدعم معزولة عن حساب موظف الدعم الشخصي في نفس المتصفح.
 *
 * التبويب يُفتح في متصفح الموظف، وقد يكون داخلًا تطبيق الويب بحسابه في تبويب
 * آخر. كل اختبار هنا يمسك تسرّبًا بين الحسابين.
 */

const future = () => new Date(Date.now() + 30 * 60_000).toISOString()

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('رمز الجلسة', () => {
  it('رمز الجلسة يسبق رمز الحساب في هذا التبويب', () => {
    setToken('staff-own-token')
    supportSession.start('support-token', future(), 7)

    expect(getToken()).toBe('support-token')
  })

  /** **في `sessionStorage` لا `localStorage`** — فلا يستبدل رمز الموظف في تبويباته. */
  it('الجلسة لا تمس رمز الحساب المشترك بين التبويبات', () => {
    setToken('staff-own-token')
    supportSession.start('support-token', future(), 7)

    expect(localStorage.getItem('qintar.token')).toBe('staff-own-token')
  })

  /**
   * **رفضٌ داخل الجلسة يمحو رمز الجلسة وحده.**
   *
   * محو `localStorage` هنا يُخرج موظف الدعم من حسابه الشخصي في كل تبويباته.
   */
  it('٤٠١ داخل الجلسة لا يُخرج الموظف من حسابه', async () => {
    setToken('staff-own-token')
    supportSession.start('support-token', future(), 7)
    vi.stubGlobal('fetch', vi.fn(async () => respond(401, { success: false, message: 'x', data: null, errors: null })))

    await expect(api.get('/auth/me')).rejects.toThrow()

    expect(supportSession.isActive()).toBe(false)
    expect(localStorage.getItem('qintar.token')).toBe('staff-own-token')
  })

  it('الجلسة المنتهية تُمحى ولا يُرسل رمزها', () => {
    supportSession.start('support-token', new Date(Date.now() - 1000).toISOString(), 7)

    expect(supportSession.token()).toBeNull()
    expect(sessionStorage.getItem('qintar.support.token')).toBeNull()
  })
})

describe('المسودات', () => {
  /**
   * **مسودات الموظف الشخصية لا تُرفع لحساب المستخدم.**
   *
   * الطابور في `localStorage` مشترك بين التبويبات.
   */
  it('المزامنة معطّلة داخل جلسة الدعم', async () => {
    draftQueue.add({ amount: '45.00', merchant_name: 'مسودة الموظف الشخصية' })
    supportSession.start('support-token', future(), 7)

    const fetchMock = vi.fn(async () => respond(201, { success: true, message: null, data: {}, errors: null }))
    vi.stubGlobal('fetch', fetchMock)

    const { renderHook } = await import('@testing-library/react')
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    const { useDraftSync } = await import('@/lib/offline/useDraftSync')
    const client = new QueryClient()

    renderHook(() => useDraftSync(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(draftQueue.all()).toHaveLength(1)
  })
})

describe('صفحة استقبال الرابط', () => {
  /** **الرمز يُمحى من العنوان قبل أي طلب**، فلا يبقى في سجل المتصفح. */
  it('تمحو الرمز من العنوان قبل إرسال الطلب', async () => {
    window.history.replaceState(null, '', '/support-session#code=' + 'a'.repeat(48))

    let urlAtFetch = ''
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        urlAtFetch = window.location.href
        return respond(422, { success: false, message: 'انتهت صلاحية الرابط أو استُخدم.', data: null, errors: null })
      }),
    )

    render(<SupportSessionScreen />)

    expect(await screen.findByText('انتهت صلاحية الرابط أو استُخدم.')).toBeInTheDocument()
    expect(urlAtFetch).not.toContain('code=')
    expect(window.location.hash).toBe('')
  })

  it('تبدأ الجلسة بعد الاستبدال', async () => {
    window.history.replaceState(null, '', '/support-session#code=' + 'b'.repeat(48))
    const replace = vi.fn()
    vi.stubGlobal('location', { ...window.location, hash: '#code=' + 'b'.repeat(48), replace })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respond(200, {
          success: true,
          message: null,
          errors: null,
          data: { token: 'issued-token', expires_at: future(), request: { id: 9 } },
        }),
      ),
    )

    render(<SupportSessionScreen />)

    await waitFor(() => expect(supportSession.token()).toBe('issued-token'))
    expect(supportSession.requestId()).toBe(9)
  })
})
