"use client";

import { useState } from "react";

interface AccordionProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}

export default function Accordion({ title, badge, children, defaultOpen = false, actions }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2 py-3 px-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex justify-between items-center hover:bg-gray-50 transition-colors rounded min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <h4 className="font-medium text-sm text-gray-900 truncate">{title}</h4>
          </div>
          {badge && (
            <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded shrink-0">
              {badge}
            </span>
          )}
        </button>
        {actions}
      </div>
      {isOpen && (
        <div className="pb-3 pl-7 pr-1">
          {children}
        </div>
      )}
    </div>
  );
}
