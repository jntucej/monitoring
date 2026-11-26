"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { useRoleConsoleChrome } from "@/hooks/useRoleConsoleChrome";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CommandBar as GenericCommandBar } from "@/components/shared/CommandBar";

export function RoleSearchBar({ role }: { role: string }) {
  const chrome = useRoleConsoleChrome(role);
  const CommandBar = chrome.CommandBar ?? GenericCommandBar;

  const shortcuts = useMemo(
    () => [
      {
        key: "k",
        mod: true,
        handler: () => chrome.setCommandBarOpen((o: boolean) => !o),
      },
      {
        key: "Escape",
        handler: () => {
          if (chrome.commandBarOpen) chrome.setCommandBarOpen(false);
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chrome.commandBarOpen],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 lg:px-6">
        <button
          type="button"
          onClick={() => chrome.setCommandBarOpen(true)}
          aria-label="Search commands or people"
          className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-xs text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">Search commands or people...</span>
        </button>
      </div>
      <CommandBar
        role={role}
        open={chrome.commandBarOpen}
        onClose={() => chrome.setCommandBarOpen(false)}
      />
    </>
  );
}
