import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Activity,
  GitCompare,
  Lightbulb,
  FileText,
  FolderKanban,
  Key,
  ScrollText,
  Server,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Leaf
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'job-runs', label: 'Job Runs', icon: Activity },
  { id: 'compare-selector', label: 'Compare', icon: GitCompare },
  { id: 'suggestions', label: 'Suggestions', icon: Lightbulb },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
  { id: 'system', label: 'System', icon: Server },
];

const settingsItems = [
  { id: 'settings-profile', label: 'Profile', icon: Settings },
  { id: 'settings-organization', label: 'Organization', icon: Settings },
  { id: 'settings-members', label: 'Members', icon: Settings },
  { id: 'settings-security', label: 'Security', icon: Settings },
];

export function AppSidebar() {
  const { view, setView, sidebarCollapsed, setSidebarCollapsed } = useApp();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">GreenAI</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="p-1.5 bg-primary rounded-lg mx-auto">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                sidebarCollapsed && "justify-center px-0"
              )}
              onClick={() => setView(item.id as any)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}

        <Separator className="my-3" />

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            sidebarCollapsed && "justify-center px-0"
          )}
          onClick={() => setView('docs')}
          title={sidebarCollapsed ? 'Documentation' : undefined}
        >
          <BookOpen className="h-5 w-5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Documentation</span>}
        </Button>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 mr-2" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
