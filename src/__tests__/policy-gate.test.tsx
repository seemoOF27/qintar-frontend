import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { keys } from '@/api/hooks/keys'
import type { User } from '@/api/types'
import { PolicyGate } from '@/components/PolicyGate'

/**
 * بوابة السياسة — **مستويان**، مُختبَرة بالعرض لا بفحص النص.
 *
 * تغيير جوهري يحجب التطبيق، وتحديث بسيط يُعرض ولا يمس الاستخدام، ومن لا
 * يوافق يصل إلى خصوصيته دائمًا.
 */

const baseUser: User = {
  id: 1,
  name: 'سمو',
  email: 'a@b.com',
  email_verified: true,
  language: 'ar',
  currency: 'SAR',
  salary_trigger_method: 'manual',
  salary_fixed_day: null,
  policy_status: 'current',
  policy_acceptance_required: false,
  policy_update_available: false,
}

function renderGate(user: User, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(keys.me, user)

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <PolicyGate>
          <Routes>
            <Route path="/" element={<p>الرئيسية</p>} />
            <Route path="/privacy" element={<p>شاشة الخصوصية</p>} />
          </Routes>
        </PolicyGate>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/legal/accept')) {
        return new Response(
          JSON.stringify({ success: true, message: null, errors: null, data: { ...baseUser } }),
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: null,
          errors: null,
          data: {
            version: '1.1.0',
            privacy_policy: 'نص السياسة',
            terms_of_use: 'نص الشروط',
            hash: 'x',
          },
        }),
      )
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('بوابة السياسة', () => {
  it('بلا تغيير: التطبيق يعمل ولا شريط', () => {
    renderGate(baseUser)

    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(screen.queryByText(/تحديثًا بسيطًا/)).not.toBeInTheDocument()
  })

  /** **تحديث بسيط لا يمس الاستخدام.** */
  it('التحديث البسيط يُعرض شريطًا والتطبيق يعمل تحته', () => {
    renderGate({ ...baseUser, policy_status: 'minor_update', policy_update_available: true })

    expect(screen.getByText(/تحديثًا بسيطًا/)).toBeInTheDocument()
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
  })

  /** **تغيير جوهري يحجب كل شيء حتى يقبل.** */
  it('التغيير الجوهري يحجب التطبيق ويعرض النص كاملًا', async () => {
    renderGate({
      ...baseUser,
      policy_status: 'acceptance_required',
      policy_acceptance_required: true,
    })

    expect(screen.queryByText('الرئيسية')).not.toBeInTheDocument()
    expect(await screen.findByText('نص السياسة')).toBeInTheDocument()
    expect(screen.getByText('نص الشروط')).toBeInTheDocument()
  })

  /** **لا صندوق مؤشَّر مسبقًا**، والزر معطَّل قبل التأشير. */
  it('زر القبول معطَّل حتى يؤشّر بنفسه', async () => {
    renderGate({
      ...baseUser,
      policy_status: 'acceptance_required',
      policy_acceptance_required: true,
    })

    const checkbox = await screen.findByRole('checkbox')
    const button = screen.getByRole('button', { name: 'أوافق وأكمل' })

    expect(checkbox).not.toBeChecked()
    expect(button).toBeDisabled()

    fireEvent.click(checkbox)

    expect(button).toBeEnabled()
  })

  it('القبول يرسل الطلب إلى الخادم', async () => {
    renderGate({
      ...baseUser,
      policy_status: 'acceptance_required',
      policy_acceptance_required: true,
    })

    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'أوافق وأكمل' }))

    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/legal/accept'))).toBe(
        true,
      ),
    )
  })

  /**
   * **لا تُحتجز البيانات رهينة.**
   *
   * من لا يوافق يصل إلى شاشة الخصوصية ليصدّر ويحذف، والخادم يُبقي مساراتها
   * مفتوحة.
   */
  it('الخصوصية مفتوحة لمن لم يوافق', () => {
    renderGate(
      { ...baseUser, policy_status: 'acceptance_required', policy_acceptance_required: true },
      '/privacy',
    )

    expect(screen.getByText('شاشة الخصوصية')).toBeInTheDocument()
    expect(screen.getByText(/التطبيق متوقف/)).toBeInTheDocument()
  })

  it('وشاشة القبول تدلّه على التصدير والحذف', async () => {
    renderGate({
      ...baseUser,
      policy_status: 'acceptance_required',
      policy_acceptance_required: true,
    })

    expect(await screen.findByRole('link', { name: /صدّر بياناتي أو احذف حسابي/ })).toHaveAttribute(
      'href',
      '/privacy',
    )
  })
})
