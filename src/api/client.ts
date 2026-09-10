import type { ApiEnvelope } from './types'

/**
 * طبقة استهلاك الـAPI.
 *
 * كل استجابة بالشكل الموحّد `{ success, message, data, errors }`، فالتعامل
 * معه في مكان واحد بدل تكراره في كل شاشة.
 *
 * والرمز في `localStorage`: التطبيق PWA بلا كوكيز، والموبايل يشارك نفس
 * الواجهة فلا تصلح جلسات الخادم — القاعدة الثالثة.
 */

const TOKEN_KEY = 'qintar.token'
const BASE = '/api/v1'

export class ApiError extends Error {
  readonly status: number

  readonly errors: Record<string, string[]> | null

  constructor(message: string, status: number, errors: Record<string, string[]> | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** خطأ تحقق من المدخلات: الرسائل مرتبطة بحقول بعينها. */
  get isValidation(): boolean {
    return this.status === 422
  }

  /** غرض يحتاج موافقة سارية — يحمل نوعها والبديل عنها. */
  get consentType(): string | null {
    const value = this.errors?.consent_type

    return typeof value === 'string' ? value : null
  }

  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0]
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    // متصفح يمنع التخزين: التطبيق يعمل للجلسة الحالية ولا ينهار.
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(TOKEN_KEY)
    else localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* تجاهل: لا نُسقط التطبيق لأن التخزين ممنوع */
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | (string | number)[]>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE}${path}`, window.location.origin)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === '') continue

    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(`${key}[]`, String(item))
    } else {
      url.searchParams.set(key, String(value))
    }
  }

  return url.pathname + url.search
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const token = getToken()

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })

  let envelope: ApiEnvelope<T>

  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError('تعذّر الاتصال بالخادم.', response.status)
  }

  if (!response.ok || envelope.success === false) {
    if (response.status === 401) setToken(null)

    throw new ApiError(envelope.message ?? 'صار خطأ.', response.status, envelope.errors)
  }

  return envelope
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
