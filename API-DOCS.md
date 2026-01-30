# Balance Tracker API Documentation

## Overview

All endpoints return the complete updated app state after mutations. Mock data is stored in-memory at runtime.

Base URL: `/api`

## Endpoints

### 1. Get All Data

**GET** `/api/portfolio`

Fetch complete portfolio data including savings, portfolio categories, lent money, and joint accounts.

**Response:**
```json
{
  "savingsAccount": 45000,
  "portfolioCategories": [...],
  "lentCategories": [...],
  "jointCategories": [...]
}
```

---

### 2. Update Savings Account

**PUT** `/api/portfolio`

Update the main savings account balance.

**Request Body:**
```json
{
  "amount": 50000
}
```

**Response:** Complete app state

---

### 3. Portfolio Category Operations

#### Add Portfolio Category

**POST** `/api/portfolio/categories`

**Request Body:**
```json
{
  "name": "Crypto Wallet",
  "amount": 10000,
  "isLiquid": false
}
```

**Response:** Complete app state

#### Update Portfolio Category

**PUT** `/api/portfolio/categories`

**Request Body:**
```json
{
  "id": "1",
  "name": "Updated Name",
  "amount": 15000,
  "isLiquid": true
}
```

**Response:** Complete app state

#### Delete Portfolio Category

**DELETE** `/api/portfolio/categories`

**Request Body:**
```json
{
  "id": "1"
}
```

**Response:** Complete app state

---

### 4. Lent Category Operations

#### Add Lent Category

**POST** `/api/lent/categories`

Create a new category for organizing lent money (e.g., "Friends", "Family").

**Request Body:**
```json
{
  "name": "Colleagues"
}
```

**Response:** Complete app state

---

### 5. Lent Entry Operations

#### Add Lent Entry

**POST** `/api/lent/entries`

Add an individual loan entry under a specific category.

**Request Body:**
```json
{
  "categoryId": "1",
  "name": "John Doe",
  "amount": 5000,
  "date": "2024-01-15",
  "notes": "Emergency loan"
}
```

**Response:** Complete app state

#### Update Lent Entry

**PUT** `/api/lent/entries`

Update an existing lent entry.

**Request Body:**
```json
{
  "id": "1",
  "name": "John Doe",
  "amount": 6000,
  "date": "2024-01-20",
  "notes": "Updated amount"
}
```

**Response:** Complete app state

#### Delete Lent Entry

**DELETE** `/api/lent/entries`

Delete a lent entry.

**Request Body:**
```json
{
  "id": "1"
}
```

**Response:** Complete app state

---

### 6. Joint Account Category Operations

#### Add Joint Category

**POST** `/api/joint/categories`

**Request Body:**
```json
{
  "name": "Joint Savings",
  "amount": 60000
}
```

**Response:** Complete app state

#### Update Joint Category

**PUT** `/api/joint/categories`

**Request Body:**
```json
{
  "id": "1",
  "name": "Updated Joint Account",
  "amount": 70000
}
```

**Response:** Complete app state

#### Delete Joint Category

**DELETE** `/api/joint/categories`

**Request Body:**
```json
{
  "id": "1"
}
```

**Response:** Complete app state

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200** - Success
- **400** - Bad Request (missing required fields)
- **500** - Server Error

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

---

## Data Persistence

Using **PostgreSQL** with Prisma ORM. All data is persisted and user-specific (requires authentication).

---

## Testing the API

### Using cURL:

```bash
# Get all data
curl http://localhost:3000/api/portfolio

# Add portfolio category
curl -X POST http://localhost:3000/api/portfolio/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Mutual Funds","amount":25000,"isLiquid":true}'

# Add lent category
curl -X POST http://localhost:3000/api/lent/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Business Partners"}'

# Add lent entry
curl -X POST http://localhost:3000/api/lent/entries \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"1","name":"Jane Smith","amount":3000,"date":"2024-05-10","notes":"Project investment"}'
```

### Using the Frontend:

The app automatically uses these APIs - all UI interactions trigger the appropriate API calls.
