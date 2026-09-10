/**
 * طابور المسودات بلا إنترنت.
 *
 * **المصروف يظهر «مسودة» حتى تتم المزامنة، ولا يدخل في أي رقم قبلها.**
 * رقم مالي مبني على شيء لم يصل الخادم بعدُ يكذب، ولو بدا مفيدًا.
 *
 * والطابور في `localStorage` لا في الكاش: الكاش يُمسح بلا إذن، والمسودة
 * عمل المستخدم.
 */

const QUEUE_KEY = 'qintar.drafts'

export interface Draft {
  /** معرّف محلي مؤقت. لا يُرسل للخادم ولا يُخلط بمعرّفاته. */
  localId: string
  createdAt: string
  payload: Record<string, unknown>
  /** آخر سبب فشل، إن وُجد. يُعرض للمستخدم بدل إعادة محاولة صامتة. */
  lastError?: string
}

function read(): Draft[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)

    return raw === null ? [] : (JSON.parse(raw) as Draft[])
  } catch {
    return []
  }
}

function write(drafts: Draft[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(drafts))
  } catch {
    /* تجاهل: التطبيق يبقى يعمل بلا طابور */
  }
}

export const draftQueue = {
  all: read,

  add(payload: Record<string, unknown>): Draft {
    const draft: Draft = {
      localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      payload,
    }

    write([...read(), draft])

    return draft
  },

  remove(localId: string): void {
    write(read().filter((draft) => draft.localId !== localId))
  },

  markFailed(localId: string, reason: string): void {
    write(read().map((d) => (d.localId === localId ? { ...d, lastError: reason } : d)))
  },

  clear(): void {
    write([])
  },
}
