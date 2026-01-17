import { useState } from 'react';
import { mockApiKeys } from '../../../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { StatusBadge } from '../StatusBadge';
import { CopyButton } from '../CopyButton';
import { Badge } from '../ui/badge';
import { Key, Plus, RotateCw, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { formatDateTime, formatRelativeTime } from '../../../lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';

export function ApiKeys() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleCreateKey = () => {
    const key = `gai_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setNewKey(key);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewKey('');
    setUnderstood(false);
    setShowKey(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for telemetry ingestion and data access
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          API keys provide access to your data. Keep them secure and rotate them regularly. Never commit keys to version control.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockApiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      {key.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(key.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.last_used_at ? formatRelativeTime(key.last_used_at) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={key.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {key.status === 'active' && (
                        <>
                          <Button size="sm" variant="outline">
                            <RotateCw className="mr-2 h-4 w-4" />
                            Rotate
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for telemetry ingestion
            </DialogDescription>
          </DialogHeader>
          
          {!newKey ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input id="keyName" placeholder="Production Ingestion Key" />
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="write" defaultChecked />
                    <label htmlFor="write" className="text-sm">job-runs:write</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="read" defaultChecked />
                    <label htmlFor="read" className="text-sm">job-runs:read</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="analytics" />
                    <label htmlFor="analytics" className="text-sm">analytics:read</label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                <Button onClick={handleCreateKey}>Generate Key</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Save your API key now!</strong> This key will only be shown once. Copy it and store it securely.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    {showKey ? newKey : '•'.repeat(newKey.length)}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <CopyButton text={newKey} />
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="understand"
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                />
                <label htmlFor="understand" className="text-sm leading-relaxed">
                  I understand this key will not be shown again and I have saved it securely
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleCloseModal} disabled={!understood}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}