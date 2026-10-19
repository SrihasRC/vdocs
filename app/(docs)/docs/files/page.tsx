import { DocsBody, DocsPage } from "@fumadocs/base-ui/layouts/spacious/page";
import { getR2StorageSummary } from "@/app/actions/files";
import { StorageManagerView } from "@/components/storage/storage-manager-view";
import { connection } from "next/server";
import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "Files & Cloudflare R2 Storage - vdocs",
  description: "Manage Cloudflare R2 object storage, resumes, certificates, and document attachments.",
};

export default async function FilesPage() {
  await connection();
  const summary = await getR2StorageSummary();

  return (
    <DocsPage full>
      <DocsBody className="mt-2 not-prose">
        <StorageManagerView initialSummary={summary} />
      </DocsBody>
    </DocsPage>
  );
}
