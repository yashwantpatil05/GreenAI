import { useState } from 'react';
import { mockReports } from '../../../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { StatusBadge } from '../StatusBadge';
import { FileText, Download, Plus, Loader2 } from 'lucide-react';
import { formatDateTime } from '../../../lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';

export function Reports() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportType, setReportType] = useState('run');
  const [template, setTemplate] = useState('executive');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Reports</h1>
          <p className="text-muted-foreground">
            Generate and download carbon footprint reports
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Create a comprehensive carbon footprint report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name</Label>
                <Input id="reportName" placeholder="Q1 2025 Carbon Report" />
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="run">Single Run</SelectItem>
                    <SelectItem value="comparison">Comparison</SelectItem>
                    <SelectItem value="monthly-esg">Monthly ESG Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive Summary</SelectItem>
                    <SelectItem value="technical">Technical Details</SelectItem>
                    <SelectItem value="esg">ESG Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Generate Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {report.name}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{report.type.replace('-', ' ')}</TableCell>
                  <TableCell className="capitalize">{report.template}</TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} animated />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(report.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.status === 'completed' ? (
                      <Button size="sm" variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
