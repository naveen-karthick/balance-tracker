# API Testing Guide for Monthly Missions

Quick reference for testing the Missions API endpoints manually.

## Prerequisites
1. Start the dev server: `npm run dev`
2. Login to get a valid session
3. Use browser console or tools like Postman/Insomnia

---

## Browser Console Testing

### 1. Get Tasks for January 2026
```javascript
fetch('/api/missions?month=2026-01')
  .then(r => r.json())
  .then(console.log);
```

### 2. Create a New Task
```javascript
fetch('/api/missions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    month: '2026-02',
    title: 'Buy groceries',
    dueDate: '2026-02-15',
    description: 'Weekly shopping'
  })
}).then(r => r.json()).then(console.log);
```

### 3. Toggle Task Completion (ID: 1)
```javascript
fetch('/api/missions/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ completed: true })
}).then(r => r.json()).then(console.log);
```

### 4. Set Reminder for Task (ID: 1)
```javascript
fetch('/api/missions/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hasReminder: true,
    reminderDate: '2026-01-13'
  })
}).then(r => r.json()).then(console.log);
```

### 5. Remove Reminder from Task (ID: 1)
```javascript
fetch('/api/missions/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hasReminder: false,
    reminderDate: null
  })
}).then(r => r.json()).then(console.log);
```

### 6. Update Task Details (ID: 1)
```javascript
fetch('/api/missions/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Updated title',
    dueDate: '2026-01-20',
    description: 'New description'
  })
}).then(r => r.json()).then(console.log);
```

### 7. Delete a Task (ID: 4)
```javascript
fetch('/api/missions/4', {
  method: 'DELETE'
}).then(r => r.json()).then(console.log);
```

### 8. Get All Templates
```javascript
fetch('/api/templates')
  .then(r => r.json())
  .then(console.log);
```

### 9. Create a Template
```javascript
fetch('/api/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Weekly Tasks',
    tasks: [
      {
        title: 'Team standup',
        dayOfMonth: 1,
        description: 'Monday morning meeting',
        setReminderOnDueDate: true
      },
      {
        title: 'Submit timesheet',
        dayOfMonth: 15,
        description: '',
        setReminderOnDueDate: false
      }
    ]
  })
}).then(r => r.json()).then(console.log);
```

### 10. Load Template into February (Template ID: 1)
```javascript
fetch('/api/templates/1/load', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ month: '2026-02' })
}).then(r => r.json()).then(console.log);
```

### 11. Delete a Template (ID: 2)
```javascript
fetch('/api/templates/2', {
  method: 'DELETE'
}).then(r => r.json()).then(console.log);
```

---

## Test Scenarios

### Scenario 1: Complete Monthly Workflow
```javascript
// 1. Check if February has tasks
fetch('/api/missions?month=2026-02').then(r => r.json()).then(console.log);

// 2. Load from template if empty
fetch('/api/templates/1/load', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ month: '2026-02' })
}).then(r => r.json()).then(console.log);

// 3. Add a custom task
fetch('/api/missions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    month: '2026-02',
    title: 'Doctor appointment',
    dueDate: '2026-02-20'
  })
}).then(r => r.json()).then(console.log);

// 4. Set reminder for new task (use returned ID)
// ... then mark complete when done
```

### Scenario 2: Template Creation & Usage
```javascript
// 1. Create template
const templatePromise = fetch('/api/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Home Maintenance',
    tasks: [
      { title: 'Check smoke detectors', dayOfMonth: 1, setReminderOnDueDate: true },
      { title: 'Water plants', dayOfMonth: 15, setReminderOnDueDate: false },
      { title: 'Clean filters', dayOfMonth: 30, setReminderOnDueDate: true }
    ]
  })
});

templatePromise.then(r => r.json()).then(template => {
  console.log('Created template:', template);
  
  // 2. Load into March
  return fetch(`/api/templates/${template.id}/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: '2026-03' })
  });
}).then(r => r.json()).then(console.log);
```

### Scenario 3: Task Management
```javascript
// Create -> Update -> Complete -> Delete
let taskId;

fetch('/api/missions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    month: '2026-01',
    title: 'Test task',
    dueDate: '2026-01-25'
  })
})
.then(r => r.json())
.then(task => {
  taskId = task.id;
  console.log('1. Created:', task);
  
  // Update
  return fetch(`/api/missions/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated test task' })
  });
})
.then(r => r.json())
.then(task => {
  console.log('2. Updated:', task);
  
  // Complete
  return fetch(`/api/missions/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true })
  });
})
.then(r => r.json())
.then(task => {
  console.log('3. Completed:', task);
  
  // Delete
  return fetch(`/api/missions/${taskId}`, { method: 'DELETE' });
})
.then(r => r.json())
.then(result => console.log('4. Deleted:', result));
```

---

## Expected Responses

### Success Cases
- `GET /api/missions`: Returns array of tasks
- `POST /api/missions`: Returns new task with ID
- `PATCH /api/missions/[id]`: Returns updated task
- `DELETE /api/missions/[id]`: Returns `{ success: true }`
- Template endpoints: Similar patterns

### Error Cases
```javascript
// Unauthorized (not logged in)
{ "error": "Unauthorized" }

// Invalid month format
{ "error": "Invalid month format. Use YYYY-MM" }

// Task not found
{ "error": "Task not found" }

// Missing fields
{ "error": "Missing required fields: month, title, dueDate" }
```

---

## Next Steps

After verifying these endpoints work:
1. Update `MonthlyMissions.tsx` to call these APIs
2. Add loading states
3. Add error handling
4. Show success/error toasts
5. Test the full workflow in the UI
