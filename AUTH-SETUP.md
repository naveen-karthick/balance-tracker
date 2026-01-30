# Authentication Setup Guide

## What We've Implemented

✅ **NextAuth.js (Auth.js v5)** - Industry standard authentication for Next.js
✅ **Email/Password Login** - Simple credentials-based authentication
✅ **User Registration** - Create account with email and password
✅ **Protected Routes** - Middleware blocks unauthenticated access
✅ **Session Management** - Automatic session handling
✅ **Password Hashing** - bcrypt for secure password storage

## Setup Steps

### 1. Update Database Schema

We added a `password` field to the User model. Run migration:

```bash
npm run db:migrate
```

Name it: `add_password_field`

This adds the password column to your users table.

### 2. Generate Secret Key

You need a random secret for NextAuth. Generate one:

**Option A - Using OpenSSL:**
```bash
openssl rand -base64 32
```

**Option B - Using Node:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option C - Visit:**
https://generate-secret.vercel.app/32

### 3. Update .env

Open `.env` and replace the NEXTAUTH_SECRET:

```env
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

## How It Works

### Authentication Flow

1. **User visits app** → Middleware checks auth
2. **Not logged in?** → Redirect to `/login`
3. **User enters credentials** → NextAuth validates
4. **Valid?** → Create session, redirect to dashboard
5. **Invalid?** → Show error message

### Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/login` | Login page | Public |
| `/register` | Registration page | Public |
| `/` | Dashboard | Protected |
| `/api/*` | API routes | Will be protected per route |

### Middleware Protection

File: `middleware.ts`

Automatically protects all routes except:
- `/login`
- `/register`
- `/api/auth/*`

If user is not authenticated → redirect to login

### Session Access

**In Server Components:**
```typescript
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();
  const userId = session?.user?.id;
  
  // Use userId to fetch user-specific data
}
```

**In Client Components:**
```typescript
"use client";
import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;
  
  return <div>Welcome {session.user.email}</div>;
}
```

**In API Routes:**
```typescript
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = parseInt(session.user.id);
  
  // Fetch user-specific data
  const data = await prisma.portfolioCategory.findMany({
    where: { userId }
  });
  
  return NextResponse.json(data);
}
```

## Testing

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Try to Access Home

Visit: `http://localhost:3000`

Should redirect to: `http://localhost:3000/login`

### 3. Register New User

1. Click "Create one" on login page
2. Fill in:
   - Email: test@example.com
   - Password: password123
   - Name: Test User
3. Click "Create Account"
4. Success! Redirects to dashboard

### 4. Login

1. Go to `/login`
2. Enter email and password
3. Click "Sign In"
4. Redirected to dashboard

### 5. Logout

Add a logout button to your app:

```typescript
import { signOut } from "next-auth/react";

<button onClick={() => signOut()}>Logout</button>
```

## Next Steps

Now that authentication is working:

### 1. Update API Routes

Change all API routes to use the logged-in user's ID:

```typescript
// Before (mock data)
const data = getData();

// After (user-specific from database)
const session = await auth();
const userId = parseInt(session.user.id);

const data = await prisma.portfolioCategory.findMany({
  where: { userId }
});
```

### 2. Update Frontend

Change frontend to call real API endpoints instead of mock data.

### 3. Add Logout Button

Add to your main app page:

```typescript
import { signOut } from "next-auth/react";

<button 
  onClick={() => signOut({ callbackUrl: "/login" })}
  className="px-4 py-2 bg-red-600 text-white rounded"
>
  Logout
</button>
```

## Security Features

✅ **Password Hashing** - bcrypt with salt rounds
✅ **Session Tokens** - Secure JWT tokens
✅ **CSRF Protection** - Built into NextAuth
✅ **HTTP-Only Cookies** - Session stored securely
✅ **Middleware Protection** - All routes protected by default

## Troubleshooting

**Error: NEXTAUTH_SECRET is not set**
→ Add NEXTAUTH_SECRET to .env

**Error: Invalid credentials**
→ Check email/password are correct
→ Ensure user exists in database

**Redirect loop**
→ Check middleware config
→ Ensure public routes are listed

**Session not persisting**
→ Check NEXTAUTH_URL matches your domain
→ Clear browser cookies and try again

## Production Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` (your Neon connection)
   - `NEXTAUTH_SECRET` (same random string)
   - `NEXTAUTH_URL` (your production URL, e.g., https://yourapp.vercel.app)

2. Deploy as normal

3. Authentication works automatically!

## File Structure

```
app/
├── api/
│   └── auth/
│       ├── [...nextauth]/
│       │   └── route.ts          # NextAuth handlers
│       └── register/
│           └── route.ts          # Registration endpoint
├── login/
│   └── page.tsx                  # Login page
└── register/
    └── page.tsx                  # Registration page

lib/
└── auth.ts                       # Auth configuration

middleware.ts                     # Route protection

types/
└── next-auth.d.ts               # TypeScript types
```

## Ready!

Your authentication system is complete. Users must now:
1. Register an account
2. Login
3. Access protected dashboard with their data
