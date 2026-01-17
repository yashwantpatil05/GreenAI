"use client";

import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Documentation" subtitle="SDKs, API references, and guides." />
      <EmptyState
        title="Docs view coming soon"
        description="Link out to your external docs or render markdown here."
      />
    </div>
  );
}
