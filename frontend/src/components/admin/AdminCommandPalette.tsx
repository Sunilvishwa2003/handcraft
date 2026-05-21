"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { LayoutGrid, MoonStar, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, SunMedium } from "lucide-react";
import { type AdminNavItem } from "@/lib/admin/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: AdminNavItem[];
  theme: string | undefined;
  onNavigate: (anchor: string) => void;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
};

export function AdminCommandPalette({
  open,
  onOpenChange,
  navItems,
  theme,
  onNavigate,
  onRefresh,
  onToggleSidebar,
  onToggleTheme,
}: Props) {
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Admin command palette"
      className="fixed left-1/2 top-24 z-[90] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[28px] border border-[var(--admin-border)] bg-[rgba(11,12,16,0.96)] shadow-[0_36px_120px_rgba(0,0,0,0.42)]"
    >
      <DialogPrimitive.Title className="sr-only">Admin command palette</DialogPrimitive.Title>
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
        <Search className="h-4 w-4 text-[var(--admin-gold)]" />
        <Command.Input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--admin-muted)]" placeholder="Search modules, actions, and workflow shortcuts..." />
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-3">
        <Command.Empty className="px-3 py-10 text-center text-sm text-[var(--admin-muted)]">No matching commands.</Command.Empty>

        <Command.Group heading="Modules" className="mb-4">
          {navItems.map((item) => (
            <Command.Item
              key={item.id}
              value={`${item.label} ${item.description}`}
              onSelect={() => {
                onNavigate(item.anchor);
                onOpenChange(false);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[var(--admin-foreground)] outline-none data-[selected=true]:bg-white/8"
            >
              <LayoutGrid className="h-4 w-4 text-[var(--admin-gold)]" />
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-[var(--admin-muted)]">{item.description}</p>
              </div>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Actions">
          <Command.Item
            onSelect={() => {
              onRefresh();
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[var(--admin-foreground)] outline-none data-[selected=true]:bg-white/8"
          >
            <RefreshCw className="h-4 w-4 text-[var(--admin-sky)]" />
            Refresh live data
          </Command.Item>
          <Command.Item
            onSelect={() => {
              onToggleSidebar();
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[var(--admin-foreground)] outline-none data-[selected=true]:bg-white/8"
          >
            {theme === "dark" ? <PanelLeftClose className="h-4 w-4 text-[var(--admin-muted)]" /> : <PanelLeftOpen className="h-4 w-4 text-[var(--admin-muted)]" />}
            Toggle sidebar
          </Command.Item>
          <Command.Item
            onSelect={() => {
              onToggleTheme();
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[var(--admin-foreground)] outline-none data-[selected=true]:bg-white/8"
          >
            {theme === "dark" ? <SunMedium className="h-4 w-4 text-[var(--admin-gold)]" /> : <MoonStar className="h-4 w-4 text-[var(--admin-gold)]" />}
            Switch to {theme === "dark" ? "light" : "dark"} mode
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
