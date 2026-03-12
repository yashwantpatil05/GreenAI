import { useState } from 'react';
import { mockProjects } from '../../../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FolderKanban, Plus, Settings } from 'lucide-react';
import { formatCO2e, formatEnergy, formatDate } from '../../../lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function Projects() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Projects</h1>
          <p className="text-muted-foreground">
            Organize and manage your ML workloads by project
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new project to organize your job runs
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" placeholder="ML Training Pipeline" />
              </div>
              <div className="space-y-2">
                <Label>Cloud Provider</Label>
                <Select defaultValue="AWS">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AWS">AWS</SelectItem>
                    <SelectItem value="GCP">Google Cloud</SelectItem>
                    <SelectItem value="Azure">Azure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Region</Label>
                <Select defaultValue="ap-south-1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ap-south-1">ap-south-1 (Mumbai)</SelectItem>
                    <SelectItem value="us-west-1">us-west-1 (N. California)</SelectItem>
                    <SelectItem value="eu-west-2">eu-west-2 (London)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {project.cloud_provider} · {project.default_region}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Runs</p>
                  <p className="text-xl font-semibold">{project.total_runs}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total CO₂e</p>
                  <p className="text-xl font-semibold">{formatCO2e(project.total_co2e)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Energy</p>
                <p className="text-lg font-semibold">{formatEnergy(project.total_kwh)}</p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(project.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}