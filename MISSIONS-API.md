# Monthly Missions API Documentation

All endpoints require authentication. The API uses in-memory mock data (will be migrated to database later).

## Authentication
All requests must include a valid session. Unauthorized requests return `401`.

---

## Tasks API

### 1. Get Tasks for a Month
**GET** `/api/missions?month=YYYY-MM`

Retrieve all tasks for a specific month.

**Query Parameters:**
- `month` (required): Format `YYYY-MM` (e.g., `2026-01`)

**Response (200):**
```json
{
  "tasks": [
    {
      "id": 1,
      "userId": "user@example.com",
      "month": "2026-01",
      "title": "Pay credit card bill",
      "dueDate": "2026-01-15",
      "description": "Pay full outstanding balance",
      "completed": false,
      "hasReminder": true,
      "reminderDate": "2026-01-13",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "month": "2026-01"
}
```

**Errors:**
- `400`: Missing or invalid month format
- `401`: Unauthorized

---

### 2. Create Task
**POST** `/api/missions`

Create a new task for a specific month.

**Request Body:**
```json
{
  "month": "2026-01",
  "title": "Pay rent",
  "dueDate": "2026-01-01",
  "description": "Optional description"
}
```

**Response (201):**
```json
{
  "id": 5,
  "userId": "user@example.com",
  "month": "2026-01",
  "title": "Pay rent",
  "dueDate": "2026-01-01",
  "description": "Optional description",
  "completed": false,
  "hasReminder": false,
  "createdAt": "2026-01-30T10:00:00.000Z",
  "updatedAt": "2026-01-30T10:00:00.000Z"
}
```

**Errors:**
- `400`: Missing required fields or invalid month format
- `401`: Unauthorized

---

### 3. Update Task
**PATCH** `/api/missions/[id]`

Update any field(s) of an existing task.

**URL Parameters:**
- `id`: Task ID (number)

**Request Body (all fields optional):**
```json
{
  "title": "Updated title",
  "dueDate": "2026-01-20",
  "description": "Updated description",
  "completed": true,
  "hasReminder": true,
  "reminderDate": "2026-01-18"
}
```

**Common Use Cases:**

**Toggle completion:**
```json
{ "completed": true }
```

**Set reminder:**
```json
{
  "hasReminder": true,
  "reminderDate": "2026-01-15"
}
```

**Remove reminder:**
```json
{
  "hasReminder": false,
  "reminderDate": null
}
```

**Edit task details:**
```json
{
  "title": "New title",
  "dueDate": "2026-01-25",
  "description": "New description"
}
```

**Response (200):**
```json
{
  "id": 5,
  "userId": "user@example.com",
  "month": "2026-01",
  "title": "Updated title",
  "dueDate": "2026-01-20",
  "description": "Updated description",
  "completed": true,
  "hasReminder": true,
  "reminderDate": "2026-01-18",
  "createdAt": "2026-01-30T10:00:00.000Z",
  "updatedAt": "2026-01-30T11:00:00.000Z"
}
```

**Errors:**
- `400`: Invalid task ID
- `404`: Task not found
- `401`: Unauthorized

---

### 4. Delete Task
**DELETE** `/api/missions/[id]`

Delete a task permanently.

**URL Parameters:**
- `id`: Task ID (number)

**Response (200):**
```json
{
  "success": true,
  "message": "Task deleted"
}
```

**Errors:**
- `400`: Invalid task ID
- `404`: Task not found
- `401`: Unauthorized

---

## Templates API

### 5. Get All Templates
**GET** `/api/templates`

Retrieve all templates for the authenticated user.

**Response (200):**
```json
{
  "templates": [
    {
      "id": 1,
      "userId": "user@example.com",
      "name": "Monthly Essentials",
      "tasks": [
        {
          "title": "Pay credit card bill",
          "dayOfMonth": 15,
          "description": "Pay full outstanding balance",
          "setReminderOnDueDate": true
        },
        {
          "title": "Review investments",
          "dayOfMonth": 28,
          "description": "",
          "setReminderOnDueDate": false
        }
      ],
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Errors:**
- `401`: Unauthorized

---

### 6. Create Template
**POST** `/api/templates`

Create a new reusable template.

**Request Body:**
```json
{
  "name": "Monthly Essentials",
  "tasks": [
    {
      "title": "Pay credit card bill",
      "dayOfMonth": 15,
      "description": "Pay full outstanding balance",
      "setReminderOnDueDate": true
    },
    {
      "title": "Review investments",
      "dayOfMonth": 28,
      "description": "Optional description",
      "setReminderOnDueDate": false
    }
  ]
}
```

**Field Requirements:**
- `name`: Required, template name
- `tasks`: Required, array with at least 1 task
  - `title`: Required
  - `dayOfMonth`: Required, integer 1-31
  - `description`: Optional
  - `setReminderOnDueDate`: Required, boolean

**Response (201):**
```json
{
  "id": 2,
  "userId": "user@example.com",
  "name": "Monthly Essentials",
  "tasks": [...],
  "createdAt": "2026-01-30T10:00:00.000Z"
}
```

**Errors:**
- `400`: Missing required fields or invalid data
- `401`: Unauthorized

---

### 7. Load Template into Month
**POST** `/api/templates/[id]/load`

Load a template and create all tasks for a specific month.

**URL Parameters:**
- `id`: Template ID (number)

**Request Body:**
```json
{
  "month": "2026-02"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Created 3 tasks from template \"Monthly Essentials\"",
  "tasks": [
    {
      "id": 10,
      "userId": "user@example.com",
      "month": "2026-02",
      "title": "Pay credit card bill",
      "dueDate": "2026-02-15",
      "description": "Pay full outstanding balance",
      "completed": false,
      "hasReminder": true,
      "reminderDate": "2026-02-15",
      "createdAt": "2026-01-30T10:00:00.000Z",
      "updatedAt": "2026-01-30T10:00:00.000Z"
    }
  ]
}
```

**Notes:**
- If a template task has `dayOfMonth: 31` but the target month only has 28 days, it will be adjusted to day 28
- Tasks with `setReminderOnDueDate: true` will have `reminderDate` automatically set to the `dueDate`

**Errors:**
- `400`: Missing or invalid month format
- `404`: Template not found
- `401`: Unauthorized

---

### 8. Delete Template
**DELETE** `/api/templates/[id]`

Delete a template permanently.

**URL Parameters:**
- `id`: Template ID (number)

**Response (200):**
```json
{
  "success": true,
  "message": "Template deleted"
}
```

**Errors:**
- `400`: Invalid template ID
- `404`: Template not found
- `401`: Unauthorized

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (not logged in)
- `404`: Not Found
- `500`: Internal Server Error

---

## Frontend Integration

Next step: Update `components/MonthlyMissions.tsx` to:
1. Fetch tasks from `GET /api/missions?month=YYYY-MM`
2. Create tasks via `POST /api/missions`
3. Update tasks via `PATCH /api/missions/[id]`
4. Delete tasks via `DELETE /api/missions/[id]`
5. Fetch templates from `GET /api/templates`
6. Create templates via `POST /api/templates`
7. Load templates via `POST /api/templates/[id]/load`

All operations will use `fetch()` with proper authentication (session cookies).
