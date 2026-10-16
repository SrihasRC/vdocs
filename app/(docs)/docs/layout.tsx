import { getDbPageTree } from "@/lib/page-tree";
import { source } from "@/lib/source";
import { DocsLayout } from "@fumadocs/base-ui/layouts/spacious";
import { baseOptions } from "@/lib/layout.shared";
import { SearchTriggerButton, SearchTriggerSmall } from "@/components/search/search-dialog";
import { FloatingAddButton } from "@/components/quick-capture/floating-add-button";
import type { ReactNode } from "react";

export const instant = false;

export default async function Layout({ children }: { children: ReactNode }) {
  const dbTree = await getDbPageTree();
  const tree = dbTree.children.length > 0 ? dbTree : source.getPageTree();

  return (
    <>
      <DocsLayout
        tree={tree}
        {...baseOptions()}
        slots={{
          searchTrigger: {
            sm: SearchTriggerSmall,
            full: SearchTriggerButton,
          },
        }}
      >
        {children}
      </DocsLayout>
      <FloatingAddButton />
    </>
  );
}
