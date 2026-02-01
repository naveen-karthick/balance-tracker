"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface SpotlightModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
  dismissLabel?: string;
}

export default function SpotlightModal({
  isOpen,
  onDismiss,
  title,
  children,
  dismissLabel = "Got it",
}: SpotlightModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onDismiss}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  {title}
                </Dialog.Title>
                <div className="mt-3 text-sm text-gray-600 space-y-2">
                  {children}
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="btn-primary w-full py-2.5 rounded-lg font-medium"
                  >
                    {dismissLabel}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
