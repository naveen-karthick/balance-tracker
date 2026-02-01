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

interface AddFromTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onLoad: (templateId: number) => void;
  onEdit: (template: Template) => void;
  onCreateTemplate: () => void;
}

export default function AddFromTemplateModal({
  isOpen,
  onClose,
  templates,
  onLoad,
  onEdit,
  onCreateTemplate,
}: AddFromTemplateModalProps) {
  const handleLoad = (templateId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onLoad(templateId);
    onClose();
  };

  const handleEdit = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(template);
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
                <div className="border-b border-gray-200 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Load Tasks from Template
                  </Dialog.Title>
                  <p className="text-sm text-gray-600 mt-1">
                    Load a template into this month, edit a template, or create a new one
                  </p>
                </div>

                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                  {templates.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-4">No templates yet. Create one below.</p>
                  ) : (
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="card p-4 flex items-center justify-between gap-3 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {template.tasks.length} task{template.tasks.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleLoad(template.id, e)}
                              className="btn-primary py-1.5 px-3 rounded-lg text-xs"
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleEdit(template, e)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                              title="Edit template"
                              aria-label="Edit template"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        onCreateTemplate();
                        onClose();
                      }}
                      className="btn-secondary w-full py-2.5 rounded-lg flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Create Template
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-4">
                  <button type="button" onClick={onClose} className="btn-secondary w-full py-2 rounded-lg">
                    Cancel
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
