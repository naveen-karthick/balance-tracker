"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";

interface SetReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskDueDate: string;
  onSetReminder: (reminderDate: string) => void;
}

export default function SetReminderModal({ isOpen, onClose, taskTitle, taskDueDate, onSetReminder }: SetReminderModalProps) {
  const [reminderDate, setReminderDate] = useState("");
  const [useDueDate, setUseDueDate] = useState(false);

  useEffect(() => {
    if (useDueDate) {
      setReminderDate(taskDueDate);
    }
  }, [useDueDate, taskDueDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDate = useDueDate ? taskDueDate : reminderDate;
    if (finalDate) {
      onSetReminder(finalDate);
      setReminderDate("");
      setUseDueDate(false);
      onClose();
    }
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
                <form onSubmit={handleSubmit}>
                  {/* Header */}
                  <div className="border-b border-gray-200 px-6 py-4">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Set Reminder
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">{taskTitle}</p>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 space-y-4">
                    {/* Use Due Date Checkbox */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        id="useDueDate"
                        checked={useDueDate}
                        onChange={(e) => setUseDueDate(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black focus:ring-2"
                      />
                      <label htmlFor="useDueDate" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Remind me on due date
                      </label>
                    </div>

                    <div>
                      <label htmlFor="reminderDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Remind me on *
                      </label>
                      <input
                        type="date"
                        id="reminderDate"
                        value={useDueDate ? taskDueDate : reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        disabled={useDueDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {useDueDate ? "Using task due date for reminder" : "You'll receive a notification on this date"}
                      </p>
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
                      className="btn-primary flex-1 py-2 rounded-lg"
                    >
                      Set Reminder
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
