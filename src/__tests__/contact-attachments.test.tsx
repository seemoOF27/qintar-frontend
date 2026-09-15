import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContactScreen } from '@/screens/ContactScreen'

/**
 * مرفقات «تواصل معنا».
 *
 * **الرسالة تُحفظ قبل المرفقات**، وتعذّر رفع ملف يُقال لا يُسكت عنه. والملف
 * المرفوض يُرفض قبل أن يغادر المتصفح.
 */

type Call = { url: string; method: string; body: unknown }

function serve(options: { failUploads?: boolean } = {}) {
  const calls: Call[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body })

      const ok = (data: unknown, status = 200) =>
        new Response(JSON.stringify({ success: true, message: null, errors: null, data }), { status })

      if (url.includes('/attachments') && method === 'POST') {
        return options.failUploads
          ? new Response(JSON.stringify({ success: false, message: 'فشل', errors: null, data: null }), { status: 500 })
          : ok({ id: 7 }, 201)
      }

      if (url.endsWith('/contact-requests') && method === 'POST') {
        return ok({ id: 7, type: 'issue', status: 'open', message: 'x', created_at: '2026-09-15T00:00:00Z' }, 201)
      }

      return ok([])
    }),
  )

  return calls
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ContactScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const image = (name = 'shot.png', size = 1000, type = 'image/png') => new File([new Uint8Array(size)], name, { type })

function fill(files: File[]) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'الرصيد لا يطابق كشف الحساب.' } })
  fireEvent.change(screen.getByLabelText('اختر مرفقات'), { target: { files } })
}

afterEach(() => vi.unstubAllGlobals())

describe('مرفقات تواصل معنا', () => {
  it('الرسالة أولًا ثم كل مرفق في طلب مستقل', async () => {
    const calls = serve()
    renderScreen()

    fill([image('a.png'), new File(['%PDF'], 'b.pdf', { type: 'application/pdf' })])
    fireEvent.click(screen.getByRole('button', { name: 'أرسل' }))

    expect(await screen.findByText('وصلتنا رسالتك.')).toBeInTheDocument()

    const posts = calls.filter((call) => call.method === 'POST')
    expect(posts.map((call) => call.url)).toEqual([
      '/api/v1/contact-requests',
      '/api/v1/contact-requests/7/attachments',
      '/api/v1/contact-requests/7/attachments',
    ])
    expect(posts[1].body).toBeInstanceOf(FormData)
  })

  /** **لا يُسكت عن الفشل** — والرسالة نفسها وصلت. */
  it('تعذّر رفع مرفق يُقال صراحةً', async () => {
    serve({ failUploads: true })
    renderScreen()

    fill([image()])
    fireEvent.click(screen.getByRole('button', { name: 'أرسل' }))

    expect(await screen.findByText(/وصلتنا رسالتك، لكن 1 من المرفقات ما انرفعت/)).toBeInTheDocument()
  })

  /** يُرفض قبل أن يغادر: نوع غير مسموح، أو حجم أكبر، أو رابع. */
  it('الملف المرفوض لا يُرفع', async () => {
    const calls = serve()
    renderScreen()

    fill([new File(['<html>'], 'page.html', { type: 'text/html' })])
    expect(screen.getByText('صور أو PDF فقط.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('اختر مرفقات'), { target: { files: [image('big.png', 6 * 1024 * 1024)] } })
    expect(screen.getByText('الملف أكبر من ٥ ميجا.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('اختر مرفقات'), {
      target: { files: [image('1.png'), image('2.png'), image('3.png'), image('4.png')] },
    })
    expect(screen.getByText('3 ملفات بحد أقصى.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'شيله' })).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'أرسل' }))
    await screen.findByText('وصلتنا رسالتك.')

    await waitFor(() => expect(calls.filter((call) => call.url.includes('/attachments'))).toHaveLength(3))
  })
})
