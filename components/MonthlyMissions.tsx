"use client";

import { useState, useEffect } from "react";
import AddMissionModal from "./AddMissionModal";
import EditMissionModal from "./EditMissionModal";
import SetReminderModal from "./SetReminderModal";
import TemplateCreatorModal from "./TemplateCreatorModal";
import LoadTemplateModal from "./LoadTemplateModal";
import LoadingOverlay from "./LoadingOverlay";
import NotificationPrompt from "./NotificationPrompt";

interface Task {
  id: number;
  title: string;
  dueDate: string;
  description?: string;
  completed: boolean;
  hasReminder: boolean;
  reminderDate?: string;
  overdue?: boolean;
}

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

export default function MonthlyMissions() {
  const [currentMonth, setCurrentMonth] = useState("2026-01");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [templateCreatorOpen, setTemplateCreatorOpen] = useState(false);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks for current month
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/missions?month=${currentMonth}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplates([]);
    }
  };

  const filteredTasks = hideCompleted ? tasks.filter(t => !t.completed) : tasks;

  const handleToggleComplete = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Optimistic update - update UI immediately
    const optimisticTasks = tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(optimisticTasks);

    try {
      const response = await fetch(`/api/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (!response.ok) throw new Error("Failed to update task");
      
      // Update with server response to ensure consistency
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === id ? updatedTask : t));
    } catch (error) {
      console.error("Error updating task:", error);
      
      // Revert optimistic update on failure
      setTasks(tasks);
      
      alert("Failed to update task. Please try again.");
    }
  };

  const handleAddTask = async (newTask: { title: string; dueDate: string; description?: string }) => {
    setIsMutating(true);
    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          ...newTask,
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");
      
      const createdTask = await response.json();
      setTasks([...tasks, createdTask]);
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditModalOpen(true);
  };

  const handleSaveTask = async (id: number, updates: { title: string; dueDate: string; description?: string }) => {
    setIsMutating(true);
    try {
      const response = await fetch(`/api/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update task");
      
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === id ? updatedTask : t));
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    setIsMutating(true);
    try {
      const response = await fetch(`/api/missions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete task");
      
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenReminderModal = (task: Task) => {
    setSelectedTask(task);
    setReminderModalOpen(true);
  };

  const handleSetReminder = async (reminderDate: string) => {
    if (!selectedTask) return;

    setIsMutating(true);
    try {
      const response = await fetch(`/api/missions/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasReminder: true, reminderDate }),
      });

      if (!response.ok) throw new Error("Failed to set reminder");
      
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    } catch (error) {
      console.error("Error setting reminder:", error);
      alert("Failed to set reminder. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteReminder = async (id: number) => {
    setIsMutating(true);
    try {
      const response = await fetch(`/api/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasReminder: false, reminderDate: null }),
      });

      if (!response.ok) throw new Error("Failed to remove reminder");
      
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === id ? updatedTask : t));
    } catch (error) {
      console.error("Error removing reminder:", error);
      alert("Failed to remove reminder. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const handlePreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setCurrentMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setCurrentMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
  };

  const handleCreateTemplate = async (template: { name: string; tasks: Template['tasks'] }) => {
    setIsMutating(true);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (!response.ok) throw new Error("Failed to create template");
      
      const newTemplate = await response.json();
      setTemplates([...templates, newTemplate]);
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Failed to create template. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleLoadTemplate = async (templateId: number) => {
    setIsMutating(true);
    try {
      const response = await fetch(`/api/templates/${templateId}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth }),
      });

      if (!response.ok) throw new Error("Failed to load template");
      
      const result = await response.json();
      // Add the newly created tasks to the current tasks list
      setTasks([...tasks, ...result.tasks]);
    } catch (error) {
      console.error("Error loading template:", error);
      alert("Failed to load template. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const getMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <NotificationPrompt />
      
      {/* Month Selector */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">{getMonthDisplay(currentMonth)}</h2>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{completedCount} of {tasks.length} completed</span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-xs text-gray-700 whitespace-nowrap">Hide completed</span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button 
          onClick={() => setAddModalOpen(true)}
          className="btn-primary py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Mission
        </button>
        <button 
          onClick={() => setTemplateCreatorOpen(true)}
          className="btn-secondary py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          Create Template
        </button>
      </div>

      {/* Empty State with Load Template */}
      {tasks.length === 0 ? (
        <div className="card p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No missions for this month</h3>
          <p className="text-sm text-gray-600 mb-6">Start by adding a mission or load from a template</p>
          <button
            onClick={() => setLoadTemplateOpen(true)}
            className="btn-secondary py-2 px-4 rounded-lg inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Load from Template
          </button>
        </div>
      ) : (
        <>
          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => (
          <div 
            key={task.id}
            className={`card p-4 border-l-4 ${
              task.completed 
                ? 'border-l-green-600' 
                : task.overdue 
                ? 'border-l-red-600' 
                : task.hasReminder 
                ? 'border-l-orange-500' 
                : 'border-l-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <button 
                onClick={() => handleToggleComplete(task.id)}
                className={`mt-1 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                  task.completed
                    ? 'bg-green-600 border-2 border-green-600'
                    : 'border-2 border-gray-300 hover:border-black'
                }`}
              >
                {task.completed && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <div className="flex-1">
                <h3 className={`font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {task.title}
                </h3>
                <p className={`text-sm mt-1 ${task.overdue ? 'text-red-600 font-medium' : task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                  {task.overdue ? 'Overdue: ' : 'Due: '}{formatDisplayDate(task.dueDate)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {task.completed ? (
                    <>
                      <span className="badge-success text-xs px-2 py-1 rounded-md">Completed</span>
                      {task.hasReminder && <span className="text-xs text-gray-400">✓ Reminder sent</span>}
                    </>
                  ) : task.overdue ? (
                    <span className="badge-error text-xs px-2 py-1 rounded-md">⚠️ Overdue</span>
                  ) : task.hasReminder ? (
                    <span className="badge-warning text-xs px-2 py-1 rounded-md flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                      Reminder Set on: {task.reminderDate ? formatDisplayDate(task.reminderDate) : 'Set'}
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleOpenReminderModal(task)}
                      className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                      Set Reminder
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleEditTask(task)}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>
          </div>
            ))}
          </div>

          {/* Show All Button */}
          {hideCompleted && completedCount > 0 && (
            <button
              onClick={() => setHideCompleted(false)}
              className="w-full mt-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Show {completedCount} completed {completedCount === 1 ? 'task' : 'tasks'}
            </button>
          )}
        </>
      )}

      {/* Modals */}
      <AddMissionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddTask}
      />

      <EditMissionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTask(null);
        }}
        mission={selectedTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onRemoveReminder={handleDeleteReminder}
      />

      <SetReminderModal
        isOpen={reminderModalOpen}
        onClose={() => {
          setReminderModalOpen(false);
          setSelectedTask(null);
        }}
        taskTitle={selectedTask?.title || ""}
        taskDueDate={selectedTask?.dueDate || ""}
        onSetReminder={handleSetReminder}
      />

      <TemplateCreatorModal
        isOpen={templateCreatorOpen}
        onClose={() => setTemplateCreatorOpen(false)}
        onSave={handleCreateTemplate}
      />

      <LoadTemplateModal
        isOpen={loadTemplateOpen}
        onClose={() => setLoadTemplateOpen(false)}
        templates={templates}
        onLoad={handleLoadTemplate}
      />

      {(isLoading || isMutating) && <LoadingOverlay />}
    </div>
  );
}
