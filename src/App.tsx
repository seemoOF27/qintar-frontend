import { Navigate, Route, Routes } from 'react-router-dom'
import { useMe } from '@/api/hooks/useAuth'
import { AppShell } from '@/components/AppShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { LoginScreen } from '@/screens/LoginScreen'
import { RegisterScreen } from '@/screens/RegisterScreen'
import { VerifyEmailScreen } from '@/screens/VerifyEmailScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { BudgetsScreen } from '@/screens/BudgetsScreen'
import { CommitmentsScreen } from '@/screens/CommitmentsScreen'
import { PiggyBanksScreen } from '@/screens/PiggyBanksScreen'
import { StatisticsScreen } from '@/screens/StatisticsScreen'
import { CyclesScreen } from '@/screens/CyclesScreen'
import { DebtsScreen } from '@/screens/DebtsScreen'
import { FundsScreen } from '@/screens/FundsScreen'
import { AddExpenseScreen } from '@/screens/AddExpenseScreen'
import { AuditLogScreen } from '@/screens/AuditLogScreen'
import { PrivacyScreen } from '@/screens/PrivacyScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { ContactScreen } from '@/screens/ContactScreen'

export function App() {
  const { data: user, isPending, isError } = useMe()

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center text-[color:var(--color-ink-muted)]">
        لحظة…
      </div>
    )
  }

  if (isError || user === undefined) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/verify" element={<VerifyEmailScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <UpdatePrompt />

      {/*
        حدُّ الأعطال داخل الهيكل لا حوله: انكسارُ شاشة يترك التنقّل يعمل،
        فيخرج المستخدم منها بدل أن يجد التطبيق كله أبيض.
      */}
      <ErrorBoundary screen="App">
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/budgets" element={<BudgetsScreen />} />
          <Route path="/commitments" element={<CommitmentsScreen />} />
          <Route path="/piggy-banks" element={<PiggyBanksScreen />} />
          <Route path="/statistics" element={<StatisticsScreen />} />
          <Route path="/cycles" element={<CyclesScreen />} />
          <Route path="/debts" element={<DebtsScreen />} />
          <Route path="/funds" element={<FundsScreen />} />
          <Route path="/add" element={<AddExpenseScreen />} />
          <Route path="/audit" element={<AuditLogScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/privacy" element={<PrivacyScreen />} />
          <Route path="/contact" element={<ContactScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  )
}
