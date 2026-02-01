"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";

interface TemplateTask {
  title: string;
  dayOfMonth: number;
  description?: string;
  setReminderOnDueDate: boolean;
}

interface Template {
  id: number;
  name: string;
  tasks: TemplateTask[];
}

interface TemplateCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: { name: string; tasks: TemplateTask[] }, templateId?: number) => void;
  template?: Template | null;
}

export default function TemplateCreatorModal({ isOpen, onClose, onSave, template }: TemplateCreatorModalProps) {
  const [templateName, setTemplateName] = useState("");
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [currentTask, setCurrentTask] = useState({
    title: "",
    dayOfMonth: 1,
    description: "",
    setReminderOnDueDate: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setTemplateName(template.name);
        setTasks(template.tasks.map((t) => ({ ...t, setReminderOnDueDate: t.setReminderOnDueDate ?? true })));
      } else {
        setTemplateName("");
        setTasks([]);
      }
      setCurrentTask({ title: "", dayOfMonth: 1, description: "", setReminderOnDueDate: true });
    }
  }, [isOpen, template]);

  const handleAddTask = () => {
    if (currentTask.title && currentTask.dayOfMonth) {
      setTasks([...tasks, currentTask]);
      setCurrentTask({
        title: "",
        dayOfMonth: 1,
        description: "",
        setReminderOnDueDate: true,
      });
    }
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (templateName && tasks.length > 0) {
      onSave({ name: templateName, tasks }, template?.id);
      setTemplateName("");
      setTasks([]);
      onClose();
    }
  };

  const isEditMode = !!template;

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-2xl transition-all">
                <form onSubmit={handleSubmit}>
                  {/* Header */}
                  <div className="border-b border-gray-200 px-6 py-4">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      {isEditMode ? "Edit Template" : "Create Mission Template"}
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">
                      {isEditMode
                        ? "Update the template name and tasks."
                        : "Create a reusable template for recurring monthly tasks"}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Template Name */}
                    <div>
                      <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        id="templateName"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="e.g., Monthly Essentials"
                        required
                      />
                    </div>

                    {/* Tasks List */}
                    {tasks.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Template Tasks ({tasks.length})</label>
                        {tasks.map((task, index) => (
                          <div key={index} className="card p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                              <p className="text-xs text-gray-600">
                                Day {task.dayOfMonth} of month
                                {task.setReminderOnDueDate && " • Reminder on due date"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTask(index)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Task Form */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Add Task to Template</label>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={currentTask.title}
                          onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="Task title"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Day of Month</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={currentTask.dayOfMonth}
                              onChange={(e) => setCurrentTask({ ...currentTask, dayOfMonth: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentTask.setReminderOnDueDate}
                                onChange={(e) => setCurrentTask({ ...currentTask, setReminderOnDueDate: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                              />
                              <span className="text-xs text-gray-700">Reminder on due date</span>
                            </label>
                          </div>
                        </div>
                        <textarea
                          value={currentTask.description}
                          onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                          placeholder="Description (optional)"
                        />
                        <button
                          type="button"
                          onClick={handleAddTask}
                          disabled={!currentTask.title}
                          className="btn-secondary w-full py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          + Add to Template
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary flex-1 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!templateName || tasks.length === 0}
                      className="btn-primary flex-1 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEditMode ? "Update Template" : "Save Template"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
