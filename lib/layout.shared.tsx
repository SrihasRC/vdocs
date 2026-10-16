import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";
import { VaultBackupTrigger } from "@/components/export/vault-backup-trigger";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
    },
    links: [
      {
        type: "custom",
        children: <VaultBackupTrigger />,
      },
    ],
    githubUrl: "https://github.com",
  };
}

