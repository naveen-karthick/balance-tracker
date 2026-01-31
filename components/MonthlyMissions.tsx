"use client";

import { useState } from "react";

export default function MonthlyMissions() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Pay credit card bill", dueDate: "Jan 15, 2026", completed: true, hasReminder: true },
    { id: 2, title: "Review investment portfolio", dueDate: "Jan 28, 2026", completed: false, hasReminder: true, reminderDate: "Jan 26" },
    { id: 3, title: "Schedule annual health checkup", dueDate: "Jan 31, 2026", completed: false, hasReminder: false },
    { id: 4, title: "Renew car insurance", dueDate: "Jan 10, 2026", completed: false, hasReminder: false, overdue: true },
  ]);

  const handleToggleComplete = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleAddTask = () => {
    alert("Add task modal - Coming soon!");
  };

  const handleEditTask = (id: number) => {
    alert(`Edit task ${id} - Coming soon!`);
  };

  const handleAddReminder = (id: number) => {
    alert(`Add reminder for task ${id} - Coming soon!`);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Month Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => alert("Previous month - Coming soon!")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">January 2026</h2>
          <button 
            onClick={() => alert("Next month - Coming soon!")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{completedCount} of {tasks.length} completed</span>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Add Task Button */}
      <button 
        onClick={handleAddTask}
        className="btn-primary w-full py-3 rounded-lg mb-6 flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add New Mission
      </button>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => (
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
                className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  task.completed
                    ? 'bg-green-500'
                    : 'border-2 border-gray-300 hover:border-indigo-600'
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
                  {task.overdue ? 'Overdue: ' : 'Due: '}{task.dueDate}
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
                      Reminder: {task.reminderDate}
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleAddReminder(task.id)}
                      className="text-xs text-gray-600 flex items-center gap-1 hover:text-black"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add reminder
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleEditTask(task.id)}
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
    </div>
  );
}
