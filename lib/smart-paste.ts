export interface ParsedStep {
  text: string;
  command?: string;
}

export interface SmartPasteResult {
  isMultiLine: boolean;
  cleanCommand: string;
  parsedSteps: ParsedStep[];
  detectedShell: string;
  hasSudo: boolean;
}

/**
 * Strips leading prompt characters (e.g. `$ `, `# `, `> `, `❯ `) from terminal snippets.
 */
export function stripPrompts(rawText: string): string {
  return rawText
    .split("\n")
    .map((line) => line.replace(/^(\$|#|>|❯|%)\s+/, ""))
    .join("\n")
    .trim();
}

/**
 * Analyzes pasted terminal text and extracts single command or step-by-step instructions.
 */
export function parseTerminalPaste(rawText: string): SmartPasteResult {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const isMultiLine = lines.length > 1;

  // Clean all lines of leading prompt symbols
  const cleanLines = lines.map((line) => line.replace(/^(\$|#|>|❯|%)\s+/, ""));

  const hasSudo = cleanLines.some((l) => /\bsudo\b/.test(l));

  // Detect shell
  let detectedShell = "bash";
  if (rawText.includes("pwsh") || rawText.includes("powershell") || rawText.includes("Get-") || rawText.includes("Set-")) {
    detectedShell = "powershell";
  } else if (rawText.includes("zsh")) {
    detectedShell = "zsh";
  }

  // Parse into steps:
  // If a line begins with # (comment), treat it as instruction text for the subsequent command
  const parsedSteps: ParsedStep[] = [];
  let pendingComment: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    if (rawLine.startsWith("#")) {
      const commentText = rawLine.replace(/^#+\s*/, "").trim();
      if (pendingComment) {
        parsedSteps.push({ text: pendingComment });
      }
      pendingComment = commentText;
    } else {
      const cmd = rawLine.replace(/^(\$|>|❯|%)\s+/, "").trim();
      if (cmd) {
        parsedSteps.push({
          text: pendingComment || `Execute step ${parsedSteps.length + 1}`,
          command: cmd,
        });
        pendingComment = null;
      }
    }
  }

  if (pendingComment) {
    parsedSteps.push({ text: pendingComment });
  }

  // Fallback if no steps parsed
  if (parsedSteps.length === 0 && cleanLines.length > 0) {
    cleanLines.forEach((l, idx) => {
      parsedSteps.push({
        text: `Step ${idx + 1}`,
        command: l,
      });
    });
  }

  const cleanCommand = cleanLines.join("\n");

  return {
    isMultiLine,
    cleanCommand,
    parsedSteps,
    detectedShell,
    hasSudo,
  };
}
