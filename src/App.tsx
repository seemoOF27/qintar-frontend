import { Navigate, Route, Routes } from 'react-router-dom'
import { useMe } from '@/api/hooks/useAuth'
import { AppShell } from '@/components/AppShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { PolicyGate } from '@/components/PolicyGate'
import { SupportSessionBanner } from '@/components/SupportSessionBanner'
import { supportSession } from '@/lib/supportSession'
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
import { LegalScreen } from '@/screens/LegalScreen'
import { SupportSessionScreen } from '@/screens/SupportSessionScreen'
import { CashbackScreen } from '@/screens/CashbackScreen'

export function App() {
  // **قبل أي فحص هوية.** تبويب جلسة الدعم يصل بلا رمز، ورابط الدعم هو هويته.
  if (window.location.pathname === '/support-session') {
    return <SupportSessionScreen />
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
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
        {/* **بلا تسجيل** — من يُطلب منه القبول يقرأ قبل أن يملك حسابًا. */}
        <Route path="/legal" element={<LegalScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      {/* ثابت ولا يُغلق: موظف الدعم يرى حساب شخص آخر، والشريط يمنعه أن ينسى. */}
      {supportSession.isActive() && <SupportSessionBanner />}
      <UpdatePrompt />

      {/*
        حدُّ الأعطال داخل الهيكل لا حوله: انكسارُ شاشة يترك التنقّل يعمل،
        فيخرج المستخدم منها بدل أن يجد التطبيق كله أبيض.
      */}
      <ErrorBoundary screen="App">
        <PolicyGate>
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
            <Route path="/legal" element={<LegalScreen />} />
            <Route path="/cashback" element={<CashbackScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PolicyGate>
      </ErrorBoundary>
    </AppShell>
  )
}
