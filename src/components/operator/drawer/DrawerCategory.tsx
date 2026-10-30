"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DrawerItem } from "./DrawerItem";
import type { DrawerCategoryDef } from "./OperatorDrawer";

interface DrawerCategoryProps {
  category: DrawerCategoryDef;
  isOpen: boolean;
  onToggle: () => void;
}

export function DrawerCategory({ category, isOpen, onToggle }: DrawerCategoryProps) {
  const handleToggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider",
          "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
          "transition-colors select-none"
        )}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          {category.icon && (
            <category.icon className="w-4 h-4" />
          )}
          {category.label}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      
      {isOpen && (
        <div className="bg-[var(--bg-base)]">
          {category.items.map((item) => (
            <DrawerItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.active}
            />
          ))}
        </div>
      )}
    </div>
  );
}
