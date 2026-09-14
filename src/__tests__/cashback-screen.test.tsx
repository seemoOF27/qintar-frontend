import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import payload from '@/vendor/card-payload.fixture.json'
import { CashbackScreen } from '@/screens/CashbackScreen'

/**
 * شاشة «بطاقتك مقابل صرفك» — ما يفرض العقد ظهوره في الشاشة لا في السياسة.
 *
 * `contracts/consent-and-transparency.md`: الإفصاح قبل التفعيل، وشارة التاريخ،
 * وشارة التقادم مع السبب، **وتنويه بجانب كل نتيجة لا في التذييل وحده**.
 */

type Routes = Record<string, unknown>

function serve(routes: Routes) {
  const calls: { url: string; method: string }[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })
      const key = Object.keys(routes).find((path) => url.includes(path))

      return new Response(JSON.stringify({ success: true, message: null, errors: null, data: key ? routes[key] : null }))
    }),
  )

  return calls
}

const privacy = (granted: boolean) => ({
  consents: { card_integration: { granted, version: '1.1.0', granted_at: null } },
  data_egress: { ever: false, last: null, per_purpose: {} },
  backup: { password_set: false, last_sent_at: null },
  deletion: { requested_at: null, scheduled_for: null },
  activity: [],
})

const catalog = (overrides = {}) => ({
  available: true,
  cards: payload.cards,
  categories: payload.categories,
  schema_version: '1.2.1',
  fetched_at: '2026-09-13T05:00:00Z',
  is_stale: false,
  last_attempted_at: '2026-09-13T05:00:00Z',
  last_failure: null,
  ...overrides,
})

const spendProfile = {
  month: '2026-09',
  spend: { fuel: 400, dining: 800, delivery: 300, grocery: 1500, pharmacy: 100, travel: 0, education: 0, intl: 0, other: 900 },
  total: '4000.00',
  mapped: '3000.00',
  coverage_percent: 75,
  unmapped_budgets: [{ id: 3, name: 'ملابس', spent: '1000.00' }],
  uncategorised: '0.00',
  transaction_count: 12,
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CashbackScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('قبل الموافقة', () => {
  /** **النص الكامل قبل التفعيل**، ولا طلب واحد لبيانات الميزة. */
  it('يعرض نص الموافقة ولا يطلب شيئًا من الميزة', async () => {
    const calls = serve({
      '/privacy/consents/card_integration/text': { type: 'card_integration', version: '1.1.0', text: 'نص الموافقة من العقد', fallback: 'البديل' },
      '/privacy': privacy(false),
    })

    renderScreen()

    expect(await screen.findByText('نص الموافقة من العقد')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'فعّل الميزة' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'مو الحين' })).toBeInTheDocument()
    expect(calls.some((call) => call.url.includes('/cashback/'))).toBe(false)
  })
})

describe('بعد الموافقة', () => {
  beforeEach(() => {
    serve({
      '/cashback/cards': catalog(),
      '/cashback/spend': spendProfile,
      '/cashback/mappings': { categories: payload.categories, budgets: [] },
      '/user-cards': [],
      '/privacy': privacy(true),
    })
  })

  /** شارة المصدر بتاريخ البيانات — العقد. */
  it('يعرض تاريخ بيانات البطاقات', async () => {
    renderScreen()

    expect(await screen.findByText(/بيانات البطاقات بتاريخ/)).toBeInTheDocument()
  })

  /** **مؤشر التغطية ظاهر** وأسماء الميزانيات غير المربوطة. */
  it('يعلن نسبة التغطية وما لم يُربط', async () => {
    renderScreen()

    expect(await screen.findByText(/مصنَّف منه 75٪/)).toBeInTheDocument()
    expect(screen.getByText(/ميزانيات بلا فئة: ملابس/)).toBeInTheDocument()
  })

  /** **التنويه بجانب كل نتيجة** — سبع بطاقات، سبعة تنويهات. */
  it('كل نتيجة معها تنويهها', async () => {
    renderScreen()

    const heading = await screen.findByText('لو صرفت كل شيء ببطاقة واحدة')
    const section = heading.closest('section')!

    expect(within(section).getAllByText(/تقديري ومبني على شروط منشورة/)).toHaveLength(7)
  })
})

describe('التقادم', () => {
  /** **بعد أسبوع مع سبب التعذّر** — لا تقادم يُخفى. */
  it('يعرض شارة التقادم وسببها', async () => {
    serve({
      '/cashback/cards': catalog({ is_stale: true, last_failure: 'unreachable' }),
      '/cashback/spend': spendProfile,
      '/cashback/mappings': { categories: payload.categories, budgets: [] },
      '/user-cards': [],
      '/privacy': privacy(true),
    })

    renderScreen()

    expect(await screen.findByText(/أقدم من أسبوع/)).toBeInTheDocument()
    expect(screen.getByText(/تعذّر الوصول لمنصة البطاقات/)).toBeInTheDocument()
  })
})

describe('لا يغادر الصرف', () => {
  /**
   * **كل طلب إلى خادمنا، ولا طلب يرسل صرفًا.** الحساب في المتصفح.
   */
  it('لا طلب لغير خادمنا، ولا طلب كتابة يحمل الصرف', async () => {
    const calls = serve({
      '/cashback/cards': catalog(),
      '/cashback/spend': spendProfile,
      '/cashback/mappings': { categories: payload.categories, budgets: [] },
      '/user-cards': [],
      '/privacy': privacy(true),
    })

    renderScreen()
    await screen.findByText('لو صرفت كل شيء ببطاقة واحدة')

    for (const call of calls) {
      expect(call.url.startsWith('/api/v1/')).toBe(true)
      expect(call.method).toBe('GET')
    }
  })
})
