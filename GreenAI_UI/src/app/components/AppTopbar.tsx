import { useApp } from '../../context/AppContext';
import { mockProjects } from '../../data/mockData';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Bell, Search, User, LogOut, Settings, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { formatDate } from '../../lib/utils';

export function AppTopbar() {
  const { 
    selectedProjectId, 
    setSelectedProjectId, 
    dateRange, 
    setDateRange,
    setView,
    setIsAuthenticated
  } = useApp();

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('login');
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 gap-4">
      {/* Left: Project Switcher */}
      <div className="flex items-center gap-4 flex-1">
        <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {mockProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
            <SelectItem value="all">All Projects</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(dateRange.from.toISOString())} - {formatDate(dateRange.to.toISOString())}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: new Date(new Date().setDate(new Date().getDate() - 7)),
                    to: new Date()
                  })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: new Date(new Date().setDate(new Date().getDate() - 30)),
                    to: new Date()
                  })}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: new Date(new Date().setDate(new Date().getDate() - 90)),
                    to: new Date()
                  })}
                >
                  Last 90 days
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search runs by name or ID..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Right: Notifications & User */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>Sarah Chen</span>
                <span className="text-xs text-muted-foreground font-normal">
                  sarah.chen@company.com
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView('settings-profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
