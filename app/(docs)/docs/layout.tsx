import { source } from "@/lib/source";
import { DocsLayout } from "@fumadocs/base-ui/layouts/spacious";
import { baseOptions } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      tabs={[
        {
          title: "Vault",
          description: "Personal docs & knowledge base",
          url: "/docs",
        },
        {
          title: "Commands",
          description: "System commands & CLI snippets",
          url: "/docs/commands",
        },
        {
          title: "Applications",
          description: "Job applications, questions & profiles",
          url: "/docs/applications",
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
