import { getDbPageTree } from "@/lib/page-tree";
import { source } from "@/lib/source";
import { DocsLayout } from "@fumadocs/base-ui/layouts/spacious";
import { baseOptions } from "@/lib/layout.shared";
import { SearchTriggerButton, SearchTriggerSmall } from "@/components/search/search-dialog";
import { CustomHeaderActions } from "@/components/layout/custom-header-actions";
import type { ReactNode } from "react";

export const instant = false;

export default async function Layout({ children }: { children: ReactNode }) {
  const dbTree = await getDbPageTree();
  const tree = dbTree.children.length > 0 ? dbTree : source.getPageTree();

  return (
    <DocsLayout
      tree={tree}
      {...baseOptions()}
      slots={{
        searchTrigger: {
          sm: SearchTriggerSmall,
          full: SearchTriggerButton,
        },
        actions: CustomHeaderActions,
      }}
    >
      {children}
    </DocsLayout>
  );
}
