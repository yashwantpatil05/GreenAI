import { AppProvider, useApp } from '../context/AppContext';
import { ThemeProvider } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import { AppSidebar } from './components/AppSidebar';
import { AppTopbar } from './components/AppTopbar';

// Auth screens
import { Login } from './components/screens/Login';
import { Signup } from './components/screens/Signup';
import { Onboarding } from './components/screens/Onboarding';

// Main screens
import { Dashboard } from './components/screens/Dashboard';
import { JobRuns } from './components/screens/JobRuns';
import { JobRunDetail } from './components/screens/JobRunDetail';
import { CompareSelector } from './components/screens/CompareSelector';
import { CompareResult } from './components/screens/CompareResult';
import { Suggestions } from './components/screens/Suggestions';
import { Reports } from './components/screens/Reports';
import { Projects } from './components/screens/Projects';
import { ApiKeys } from './components/screens/ApiKeys';
import { AuditLogs } from './components/screens/AuditLogs';
import { SystemStatus } from './components/screens/SystemStatus';
import { Settings } from './components/screens/Settings';
import { Docs } from './components/screens/Docs';

function AppContent() {
  const { view, isAuthenticated } = useApp();

  // Auth screens
  if (!isAuthenticated) {
    if (view === 'signup') return <Signup />;
    if (view === 'onboarding') return <Onboarding />;
    return <Login />;
  }

  // Onboarding
  if (view === 'onboarding') {
    return <Onboarding />;
  }

  // Main app layout
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'dashboard' && <Dashboard />}
          {view === 'job-runs' && <JobRuns />}
          {view === 'job-run-detail' && <JobRunDetail />}
          {view === 'compare-selector' && <CompareSelector />}
          {view === 'compare-result' && <CompareResult />}
          {view === 'suggestions' && <Suggestions />}
          {view === 'reports' && <Reports />}
          {view === 'projects' && <Projects />}
          {view === 'api-keys' && <ApiKeys />}
          {view === 'audit-logs' && <AuditLogs />}
          {view === 'system' && <SystemStatus />}
          {(view.startsWith('settings-') || view === 'settings-profile' || view === 'settings-organization' || view === 'settings-members' || view === 'settings-security') && <Settings />}
          {view === 'docs' && <Docs />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppProvider>
        <AppContent />
        <Toaster />
      </AppProvider>
    </ThemeProvider>
  );
}
