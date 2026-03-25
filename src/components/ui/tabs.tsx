import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: Array<{ id: string; label: string; icon?: React.ReactNode }>;
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
}: TabsProps) {
  return (
    <div className={cn("w-full border-b border-gray-200", className)}>
      <nav className="-mb-px flex gap-1 overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900",
              )}
            >
              {tab.icon ? (
                <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">
                  {tab.icon}
                </span>
              ) : null}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
