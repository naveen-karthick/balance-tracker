"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface Template {
  id: number;
  name: string;
  tasks: {
    title: string;
    dayOfMonth: number;
    description?: string;
    setReminderOnDueDate: boolean;
  }[];
}

interface LoadTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onLoad: (templateId: number) => void;
}

export default function LoadTemplateModal({ isOpen, onClose, templates, onLoad }: LoadTemplateModalProps) {
  const handleLoadTemplate = (templateId: number) => {
    onLoad(templateId);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Load from Template
                  </Dialog.Title>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a template to populate this month
                  </p>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  {templates.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No templates created yet</p>
                      <button
                        onClick={onClose}
                        className="btn-secondary py-2 px-4 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleLoadTemplate(template.id)}
                          className="w-full card p-4 hover:border-gray-300 hover:shadow-md transition-all text-left"
                        >
                          <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                          <div className="space-y-1">
                            {template.tasks.map((task, idx) => (
                              <p key={idx} className="text-xs text-gray-600">
                                • {task.title} (Day {task.dayOfMonth})
                              </p>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {template.tasks.length} tasks
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {templates.length > 0 && (
                  <div className="border-t border-gray-200 px-6 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary w-full py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
