import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockProjects } from '../data/mockData';

type View = 
  | 'login' 
  | 'signup' 
  | 'onboarding'
  | 'dashboard' 
  | 'job-runs' 
  | 'job-run-detail'
  | 'compare-selector'
  | 'compare-result'
  | 'suggestions'
  | 'suggestion-detail'
  | 'reports'
  | 'projects'
  | 'api-keys'
  | 'audit-logs'
  | 'system'
  | 'settings-profile'
  | 'settings-organization'
  | 'settings-members'
  | 'settings-security'
  | 'docs';

interface AppContextType {
  view: View;
  setView: (view: View) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedRunId: string | null;
  setSelectedRunId: (id: string | null) => void;
  selectedSuggestionId: string | null;
  setSelectedSuggestionId: (id: string | null) => void;
  comparisonBaseline: string | null;
  setComparisonBaseline: (id: string | null) => void;
  comparisonCandidate: string | null;
  setComparisonCandidate: (id: string | null) => void;
  dateRange: { from: Date; to: Date };
  setDateRange: (range: { from: Date; to: Date }) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  showCreateProjectModal: boolean;
  setShowCreateProjectModal: (show: boolean) => void;
  showCreateApiKeyModal: boolean;
  setShowCreateApiKeyModal: (show: boolean) => void;
  showCompareModal: boolean;
  setShowCompareModal: (show: boolean) => void;
  showReportModal: boolean;
  setShowReportModal: (show: boolean) => void;
  showInviteMemberModal: boolean;
  setShowInviteMemberModal: (show: boolean) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('login');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(mockProjects[0].id);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [comparisonBaseline, setComparisonBaseline] = useState<string | null>(null);
  const [comparisonCandidate, setComparisonCandidate] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateApiKeyModal, setShowCreateApiKeyModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Date range: last 7 days
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        selectedProjectId,
        setSelectedProjectId,
        selectedRunId,
        setSelectedRunId,
        selectedSuggestionId,
        setSelectedSuggestionId,
        comparisonBaseline,
        setComparisonBaseline,
        comparisonCandidate,
        setComparisonCandidate,
        dateRange,
        setDateRange,
        sidebarCollapsed,
        setSidebarCollapsed,
        onboardingStep,
        setOnboardingStep,
        showCreateProjectModal,
        setShowCreateProjectModal,
        showCreateApiKeyModal,
        setShowCreateApiKeyModal,
        showCompareModal,
        setShowCompareModal,
        showReportModal,
        setShowReportModal,
        showInviteMemberModal,
        setShowInviteMemberModal,
        isAuthenticated,
        setIsAuthenticated
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
