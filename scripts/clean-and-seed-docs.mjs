import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import crypto from "node:crypto";

const uuidv4 = () => crypto.randomUUID();

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

function flattenBlocksToSearchText(title, blocks, tags = []) {
  const parts = [title, ...tags];

  for (const block of blocks) {
    switch (block.type) {
      case "command":
        if (block.data.title) parts.push(block.data.title);
        if (block.data.description) parts.push(block.data.description);
        if (block.data.command) parts.push(block.data.command);
        if (block.data.shell) parts.push(block.data.shell);
        if (block.data.os) parts.push(...block.data.os);
        if (block.data.notes) parts.push(block.data.notes);
        break;
      case "steps":
        if (block.data.title) parts.push(block.data.title);
        for (const step of block.data.steps || []) {
          if (step.text) parts.push(step.text);
          if (step.command) parts.push(step.command);
        }
        break;
      case "qa":
        if (block.data.question) parts.push(block.data.question);
        if (block.data.short) parts.push(block.data.short);
        if (block.data.long) parts.push(block.data.long);
        break;
      case "note":
        if (block.data.title) parts.push(block.data.title);
        if (block.data.markdown) parts.push(block.data.markdown);
        break;
      case "callout":
        if (block.data.title) parts.push(block.data.title);
        if (block.data.content) parts.push(block.data.content);
        break;
      case "kv":
        if (block.data.title) parts.push(block.data.title);
        if (block.data.description) parts.push(block.data.description);
        for (const row of block.data.rows || []) {
          if (row.key) parts.push(row.key);
          if (row.value) parts.push(row.value);
        }
        break;
    }
  }

  return parts.filter(Boolean).join(" ").trim();
}

async function run() {
  console.log("Cleaning up testing pages...");

  // Delete all non-root pages
  await sql`DELETE FROM pages WHERE path != ''`;

  console.log("Deleted old test pages.");

  // Update root page (path = '')
  const homeBlocks = [
    {
      id: "vault-intro",
      type: "note",
      data: {
        title: "Personal Documentation Vault",
        markdown:
          "Welcome to your personal documentation vault. This system provides structured, offline-first technical documentation, command references, and runbooks backed by Neon Postgres.\n\n### Knowledge Base Sections\n- **Development**: Version control setup, GitHub SSH configuration, and development environment workflows.\n- **System Maintenance**: Storage hygiene, package manager cache control, and application cleanup runbooks.\n\n### Quick Navigation\n- Press **Ctrl + K** or use the search bar above to instantly query commands, runbooks, and notes.\n- Press **E** while viewing any page to toggle in-place editing.\n- Use **Quick Capture** in the header to rapidly record commands or notes on the fly.",
      },
    },
    {
      id: "vault-quick-command",
      type: "command",
      data: {
        title: "CLI Vault Search",
        description: "Fast fuzzy search across all commands and notes directly from your terminal",
        shell: "bash",
        command: "vdocs search \"paccache\"",
        sudo: false,
        os: ["Linux", "macOS"],
        notes: "Powered by Postgres pg_trgm similarity search.",
      },
    },
    {
      id: "vault-steps",
      type: "steps",
      data: {
        title: "How to Use vdocs",
        steps: [
          {
            text: "Browse runbooks and snippets using the left sidebar navigation.",
          },
          {
            text: "Use Ctrl + K or the top search bar for instant trigram search across all commands and runbooks.",
            command: "Ctrl + K",
          },
          {
            text: "Press E on any documentation page to enter in-place edit mode.",
          },
        ],
      },
    },
  ];

  const homeSearchText = flattenBlocksToSearchText(
    "Vault Overview",
    homeBlocks,
    ["vault", "overview", "docs"]
  );

  await sql`
    UPDATE pages
    SET title = 'Vault Overview',
        blocks = ${JSON.stringify(homeBlocks)},
        tags = ARRAY['vault', 'overview', 'docs'],
        search_text = ${homeSearchText},
        updated_at = NOW()
    WHERE path = ''
  `;

  console.log("Root page updated cleanly.");

  // 1. Category: Development
  const devId = uuidv4();
  const devBlocks = [
    {
      id: "dev-intro",
      type: "note",
      data: {
        title: "Development Workflows & Tooling",
        markdown:
          "Reference documentation for developer tooling, version control workflows, repository management, and environment setup.",
      },
    },
  ];
  const devSearchText = flattenBlocksToSearchText("Development", devBlocks, ["development", "git", "github"]);

  await sql`
    INSERT INTO pages (id, parent_id, slug, path, title, template, position, blocks, tags, status, search_text)
    VALUES (
      ${devId},
      NULL,
      'development',
      'development',
      'Development',
      'note',
      1,
      ${JSON.stringify(devBlocks)},
      ARRAY['development', 'git', 'github'],
      'published',
      ${devSearchText}
    )
  `;

  // 1.1 Page: Git & GitHub Configuration (Merged)
  const gitId = uuidv4();
  const gitBlocks = [
    {
      id: "git-overview",
      type: "note",
      data: {
        title: "Overview",
        markdown:
          "This guide covers configuring Git, setting up SSH authentication for GitHub, and resolving push permission errors (such as HTTP 403 or `Permission denied (publickey)`).\n\nUsing SSH authentication eliminates repeated login prompts and token expirations associated with HTTPS credentials.",
      },
    },
    {
      id: "git-install-cmd",
      type: "command",
      data: {
        title: "Install Git",
        description: "Install Git on Debian/Ubuntu or Arch-based distributions",
        shell: "bash",
        command: "sudo pacman -S git    # Arch / CachyOS\nsudo apt install git -y # Debian / Ubuntu",
        sudo: true,
        os: ["Linux"],
      },
    },
    {
      id: "git-identity-cmd",
      type: "command",
      data: {
        title: "Configure Git User Identity",
        description: "Set global commit author name and email address",
        shell: "bash",
        command: "git config --global user.name \"Srihas\"\ngit config --global user.email \"challasrihasreddy@gmail.com\"",
        sudo: false,
        os: ["Linux", "macOS", "Windows"],
        notes: "Verify configuration with git config --get user.name and git config --get user.email.",
      },
    },
    {
      id: "git-ssh-steps",
      type: "steps",
      data: {
        title: "SSH Key Setup for GitHub",
        steps: [
          {
            text: "Check for existing SSH keys. If id_ed25519 or id_rsa already exists, you can reuse it.",
            command: "ls -al ~/.ssh",
          },
          {
            text: "Generate a new Ed25519 key pair (recommended) or 4096-bit RSA key.",
            command: "ssh-keygen -t ed25519 -C \"challasrihasreddy@gmail.com\"",
          },
          {
            text: "Start the SSH agent in the background and register your private key.",
            command: "eval \"$(ssh-agent -s)\" && ssh-add ~/.ssh/id_ed25519",
          },
          {
            text: "Display and copy your public key to the clipboard.",
            command: "cat ~/.ssh/id_ed25519.pub",
          },
          {
            text: "Navigate to GitHub Settings -> SSH and GPG Keys -> New SSH Key, paste the key contents, and save.",
          },
          {
            text: "Test the SSH connection to GitHub.",
            command: "ssh -T git@github.com",
          },
        ],
      },
    },
    {
      id: "git-remote-cmd",
      type: "command",
      data: {
        title: "Switch Repository Remote URL to SSH",
        description: "Update an existing repository remote from HTTPS to SSH to prevent authentication errors",
        shell: "bash",
        command: "git remote set-url origin git@github.com:<username>/<repo>.git",
        sudo: false,
        os: ["Linux", "macOS"],
        notes: "Verify the update with git remote -v.",
      },
    },
    {
      id: "git-troubleshoot-callout",
      type: "callout",
      data: {
        type: "info",
        title: "Troubleshooting Push Failures",
        content:
          "If push fails with 'Permission denied (publickey)', confirm that your public key is added to GitHub Settings, verify that ssh-agent is running with your key loaded (check with 'ssh-add -l'), and ensure the repository remote is using SSH syntax ('git@github.com:...').",
      },
    },
  ];
  const gitSearchText = flattenBlocksToSearchText(
    "Git & GitHub Configuration",
    gitBlocks,
    ["git", "github", "ssh", "version-control"]
  );

  await sql`
    INSERT INTO pages (id, parent_id, slug, path, title, template, position, blocks, tags, status, search_text)
    VALUES (
      ${gitId},
      ${devId},
      'git',
      'development/git',
      'Git & GitHub Configuration',
      'note',
      1,
      ${JSON.stringify(gitBlocks)},
      ARRAY['git', 'github', 'ssh', 'version-control'],
      'published',
      ${gitSearchText}
    )
  `;

  // 2. Category: System Maintenance
  const maintId = uuidv4();
  const maintBlocks = [
    {
      id: "maint-intro",
      type: "note",
      data: {
        title: "System Maintenance & Storage Hygiene",
        markdown:
          "Operational guides and maintenance commands for keeping Linux storage clean, optimizing package caches, and managing application data footprints.",
      },
    },
  ];
  const maintSearchText = flattenBlocksToSearchText(
    "System Maintenance",
    maintBlocks,
    ["maintenance", "system", "linux"]
  );

  await sql`
    INSERT INTO pages (id, parent_id, slug, path, title, template, position, blocks, tags, status, search_text)
    VALUES (
      ${maintId},
      NULL,
      'maintenance',
      'maintenance',
      'System Maintenance',
      'note',
      2,
      ${JSON.stringify(maintBlocks)},
      ARRAY['maintenance', 'system', 'linux'],
      'published',
      ${maintSearchText}
    )
  `;

  // 2.1 Page: Arch Linux Cache Hygiene
  const archId = uuidv4();
  const archBlocks = [
    {
      id: "arch-background",
      type: "note",
      data: {
        title: "Background",
        markdown:
          "On rolling-release distributions like Arch Linux and CachyOS, package managers and build tools retain previous versions and compilation artifacts by design. Routine maintenance prevents package caches, AUR directories, and GPU shader caches from consuming disk space.",
      },
    },
    {
      id: "arch-paccache-cmd",
      type: "command",
      data: {
        title: "Clean Pacman Package Cache",
        description: "Remove cached packages while retaining the last 3 versions for rollback safety",
        shell: "bash",
        command: "sudo paccache -r",
        sudo: true,
        os: ["Linux"],
        notes: "Check cache size before cleaning with: du -sh /var/cache/pacman/pkg. To keep only 1 previous version: sudo paccache -rk1.",
      },
    },
    {
      id: "arch-timer-cmd",
      type: "command",
      data: {
        title: "Automate Weekly Pacman Cache Cleanup",
        description: "Enable the systemd timer from pacman-contrib to automatically trim old package versions weekly",
        shell: "bash",
        command: "sudo systemctl enable --now paccache.timer",
        sudo: true,
        os: ["Linux"],
      },
    },
    {
      id: "arch-yay-cmd",
      type: "command",
      data: {
        title: "Clean AUR Build Cache",
        description: "Purge compiled build files, object archives, and debug artifacts in ~/.cache/yay",
        shell: "bash",
        command: "yay -Sc --noconfirm",
        sudo: false,
        os: ["Linux"],
        notes: "Check current yay cache size with: du -sh ~/.cache/yay. For unattended cleanup without prompts: yay --clean --noconfirm.",
      },
    },
    {
      id: "arch-orphans-cmd",
      type: "command",
      data: {
        title: "Remove Orphaned Dependencies",
        description: "Find and remove packages installed as dependencies that are no longer required by any installed package",
        shell: "bash",
        command: "sudo pacman -Rns $(pacman -Qdtq)",
        sudo: true,
        os: ["Linux"],
        notes: "Safe to run regularly. If no orphaned packages exist, pacman exits cleanly.",
      },
    },
    {
      id: "arch-shaders-cmd",
      type: "command",
      data: {
        title: "Clear Vulkan & ML Shader Caches",
        description: "Remove accumulated GPU shader caches and machine learning compilation artifacts",
        shell: "bash",
        command: "rm -rf ~/.cache/vulkan ~/.cache/mesa_shader_cache ~/.cache/ollama ~/.cache/llama.cpp",
        sudo: false,
        os: ["Linux"],
        notes: "Caches will regenerate automatically as needed.",
      },
    },
    {
      id: "arch-shader-cap-note",
      type: "note",
      data: {
        title: "Cap Mesa Shader Cache Size",
        markdown:
          "To prevent shader caches from expanding indefinitely, configure environment limits:\n\nCreate or edit `~/.config/environment.d/shader-cache.conf`:\n```ini\nMESA_SHADER_CACHE_DISABLE=false\nMESA_SHADER_CACHE_MAX_SIZE=512M\n```\nLog out and log back in to apply the configuration.",
      },
    },
    {
      id: "arch-all-in-one-cmd",
      type: "command",
      data: {
        title: "All-in-One Routine Maintenance",
        description: "Run package cache cleanup, AUR cache clearing, and orphan removal in a single operation",
        shell: "bash",
        command: "sudo paccache -r && yay -Sc --noconfirm && sudo pacman -Rns $(pacman -Qdtq)",
        sudo: true,
        os: ["Linux"],
        notes: "Recommended to run periodically after major system updates.",
      },
    },
  ];
  const archSearchText = flattenBlocksToSearchText(
    "Arch Linux Cache Hygiene",
    archBlocks,
    ["arch", "cachyos", "pacman", "yay", "cache", "cleanup"]
  );

  await sql`
    INSERT INTO pages (id, parent_id, slug, path, title, template, position, blocks, tags, status, search_text)
    VALUES (
      ${archId},
      ${maintId},
      'arch-cleanup',
      'maintenance/arch-cleanup',
      'Arch Linux Cache Hygiene',
      'command',
      1,
      ${JSON.stringify(archBlocks)},
      ARRAY['arch', 'cachyos', 'pacman', 'yay', 'cache', 'cleanup'],
      'published',
      ${archSearchText}
    )
  `;

  // 2.2 Page: Stremio Cache Management
  const stremioId = uuidv4();
  const stremioBlocks = [
    {
      id: "stremio-overview",
      type: "note",
      data: {
        title: "Overview",
        markdown:
          "Stremio stores streamed video segments in `~/.stremio-server/stremio-cache/` or `~/.stremio/`. Clearing this directory reclaims storage without deleting user settings, preferences, or installed addons.",
      },
    },
    {
      id: "stremio-size-cmd",
      type: "command",
      data: {
        title: "Check Stremio Cache Size",
        description: "Inspect disk space consumed by Stremio cache directories",
        shell: "bash",
        command: "du -sh ~/.stremio*",
        sudo: false,
        os: ["Linux"],
      },
    },
    {
      id: "stremio-clear-cmd",
      type: "command",
      data: {
        title: "Clear Stremio Streaming Cache",
        description: "Remove cached streaming chunks immediately",
        shell: "bash",
        command: "rm -rf ~/.stremio-server/stremio-cache/*",
        sudo: false,
        os: ["Linux"],
      },
    },
    {
      id: "stremio-cron-cmd",
      type: "command",
      data: {
        title: "Schedule Weekly Automatic Cache Purge",
        description: "Add a user cron job to clean Stremio cache every Sunday at midnight",
        shell: "bash",
        command: "(crontab -l 2>/dev/null; echo \"0 0 * * 0 rm -rf ~/.stremio-server/stremio-cache/*\") | crontab -",
        sudo: false,
        os: ["Linux"],
      },
    },
    {
      id: "stremio-relocate-steps",
      type: "steps",
      data: {
        title: "Relocate Cache to Another Drive or Partition",
        steps: [
          {
            text: "Create the target directory on the secondary drive and move existing cache.",
            command: "mkdir -p /mnt/data/stremio-cache && mv ~/.stremio-server/stremio-cache/* /mnt/data/stremio-cache/ 2>/dev/null || true",
          },
          {
            text: "Remove the old cache folder.",
            command: "rm -rf ~/.stremio-server/stremio-cache",
          },
          {
            text: "Create a symbolic link pointing from the default location to the secondary drive.",
            command: "ln -s /mnt/data/stremio-cache ~/.stremio-server/stremio-cache",
          },
        ],
      },
    },
  ];
  const stremioSearchText = flattenBlocksToSearchText(
    "Stremio Cache Management",
    stremioBlocks,
    ["stremio", "cache", "storage", "cleanup"]
  );

  await sql`
    INSERT INTO pages (id, parent_id, slug, path, title, template, position, blocks, tags, status, search_text)
    VALUES (
      ${stremioId},
      ${maintId},
      'stremio-cleanup',
      'maintenance/stremio-cleanup',
      'Stremio Cache Management',
      'command',
      2,
      ${JSON.stringify(stremioBlocks)},
      ARRAY['stremio', 'cache', 'storage', 'cleanup'],
      'published',
      ${stremioSearchText}
    )
  `;

  console.log("Successfully created Development and System Maintenance categories & pages!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
