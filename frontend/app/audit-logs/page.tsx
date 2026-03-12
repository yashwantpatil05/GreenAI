"use client";

import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";

export default function AuditLogsPage() {
  // Placeholder: hook up real data later
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Audit Logs"
        subtitle="Track all actions and changes in your organization."
      />
      <EmptyState
        title="Audit log view coming soon"
        description="Audit events will appear here once the endpoint is wired."
      />
    </div>
  );
}
