"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";

interface Mission {
  id: number;
  title: string;
  dueDate: string;
  description?: string;
  hasReminder?: boolean;
  reminderDate?: string;
}

interface EditMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
  onSave: (id: number, updates: { title: string; dueDate: string; description?: string }) => void;
  onDelete: (id: number) => void;
  onRemoveReminder: (id: number) => void;
}

export default function EditMissionModal({ isOpen, onClose, mission, onSave, onDelete, onRemoveReminder }: EditMissionModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [currentHasReminder, setCurrentHasReminder] = useState(false);
  const [currentReminderDate, setCurrentReminderDate] = useState("");

  useEffect(() => {
    if (mission) {
      setTitle(mission.title);
      setDueDate(mission.dueDate);
      setDescription(mission.description || "");
      setCurrentHasReminder(mission.hasReminder || false);
      setCurrentReminderDate(mission.reminderDate || "");
    }
  }, [mission]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mission && title && dueDate) {
      onSave(mission.id, { title, dueDate, description });
      onClose();
    }
  };

  const handleDelete = () => {
    if (mission && confirm("Are you sure you want to delete this task?")) {
      onDelete(mission.id);
      onClose();
    }
  };

  const handleRemoveReminder = () => {
    if (mission && confirm("Are you sure you want to remove the reminder?")) {
      onRemoveReminder(mission.id);
      // Update local state immediately for UI feedback
      setCurrentHasReminder(false);
      setCurrentReminderDate("");
    }
  };

  if (!mission) return null;

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
                <form onSubmit={handleSubmit}>
                  {/* Header */}
                  <div className="border-b border-gray-200 px-6 py-4">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Edit Task
                    </Dialog.Title>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 space-y-4">
                    <div>
                      <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                        Task Title *
                      </label>
                      <input
                        type="text"
                        id="edit-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        id="edit-dueDate"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        id="edit-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Reminder Section */}
                    {currentHasReminder && currentReminderDate && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-orange-700">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                            <div>
                              <p className="text-xs font-medium text-orange-900">Reminder Set</p>
                              <p className="text-xs text-orange-700">
                                {new Date(currentReminderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveReminder}
                            className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="btn-danger py-2 px-4 rounded-lg"
                    >
                      Delete
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary py-2 px-4 rounded-lg"
                    >
                      Save
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
