"use client";

import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";

export default function EmissionsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Emissions" subtitle="Detailed emissions analytics will appear here." />
      <EmptyState title="Emissions view coming soon" description="Hook up analytics endpoints to render charts." />
    </div>
  );
}
