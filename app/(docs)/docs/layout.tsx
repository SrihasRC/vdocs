import { getDbPageTree } from "@/lib/page-tree";
import { source } from "@/lib/source";
import { DocsLayout } from "@fumadocs/base-ui/layouts/spacious";
import { baseOptions } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export const instant = false;

export default async function Layout({ children }: { children: ReactNode }) {
  const dbTree = await getDbPageTree();
  const tree = dbTree.children.length > 0 ? dbTree : source.getPageTree();

  return (
    <DocsLayout
      tree={tree}
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
          url: "/docs/applications/job-answers",
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
