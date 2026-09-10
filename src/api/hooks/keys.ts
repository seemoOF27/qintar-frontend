/**
 * مفاتيح الاستعلامات.
 *
 * مركزية حتى يكون إبطال الكاش دقيقًا: تعديل عملية يبطل الإحصائيات ورصيد
 * الرحلة والميزانيات معًا، لأن الرقم الواحد يظهر في ثلاث شاشات.
 */
export const keys = {
  me: ['me'] as const,
  consents: ['consents'] as const,

  cycles: ['cycles'] as const,
  cycle: (id: number) => ['cycles', id] as const,

  budgets: ['budgets'] as const,
  piggyBanks: ['piggy-banks'] as const,
  commitments: ['commitments'] as const,
  allocations: ['auto-allocations'] as const,

  transactions: (filters: Record<string, unknown> = {}) => ['transactions', filters] as const,
  cards: ['user-cards'] as const,
  tags: ['tags'] as const,
  debts: (filters: Record<string, unknown> = {}) => ['debts', filters] as const,

  statistics: (params: Record<string, unknown>) => ['statistics', params] as const,
  auditLogs: (filters: Record<string, unknown> = {}) => ['audit-logs', filters] as const,

  privacy: ['privacy'] as const,
  consentText: (type: string) => ['consent-text', type] as const,
  impersonationRequests: ['impersonation-requests'] as const,

  parseRequest: (id: number) => ['parse-requests', id] as const,
  categorySuggestion: (merchant: string) => ['suggest-category', merchant] as const,
}

/** ما يتأثر بتغيّر عملية: الرقم الواحد يظهر في أكثر من شاشة. */
export const moneyTouchingKeys = [
  keys.cycles,
  keys.budgets,
  keys.piggyBanks,
  keys.commitments,
  keys.allocations,
  ['transactions'],
  ['statistics'],
  ['debts'],
]
