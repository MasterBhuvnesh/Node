FRONTEND ARCHITECTURE OVERVIEW

- Framework: Next.js (App Router)
- Language: TypeScript
- Runtime: React (client + server components)
- State Management: Zustand (client state)
- Data Fetching: Server Actions + fetch (or React Query optional)
- Styling: Tailwind CSS (recommended)
- Auth Handling: JWT (access token in httpOnly cookies, refresh token rotation)
- Form Handling: React Hook Form + Zod (validation)

---

PROJECT STRUCTURE (PRODUCTION GRADE)

```bash
src/
 ├── app/
 │    ├── layout.tsx
 │    ├── page.tsx
 │
 │    ├── auth/
 │    │    ├── login/page.tsx
 │    │    ├── signup/page.tsx
 │    │    ├── forgot-password/page.tsx
 │    │    └── reset-password/page.tsx
 │
 │    ├── dashboard/
 │    │    ├── page.tsx
 │    │    └── [groupId]/
 │    │         ├── page.tsx
 │    │         ├── members/page.tsx
 │    │         └── logs/page.tsx
 │
 ├── components/
 │    ├── ui/
 │    ├── group/
 │    └── member/
 │
 ├── lib/
 │    ├── api.ts
 │    ├── auth.ts
 │    └── utils.ts
 │
 ├── store/
 │    └── useAuthStore.ts
 │
 ├── hooks/
 │    └── useGroups.ts
 │
 ├── types/
 │    └── index.ts
```

---

APP ROUTING STRUCTURE

- / → Landing or redirect
- /auth/login → Login page
- /auth/signup → Signup page
- /auth/forgot-password → Forgot password page
- /auth/reset-password → Reset password page
- /dashboard → All groups
- /dashboard/[groupId] → Group detail
- /dashboard/[groupId]/members → Member management
- /dashboard/[groupId]/logs → Activity logs

---

APP WORKFLOW (FRONTEND FLOW)

- USER AUTHENTICATION
  - User logs in / signs up
  - Token stored securely (cookie)
  - Redirect to dashboard

- DASHBOARD
  - Fetch all groups for user
  - Display list

- GROUP NAVIGATION
  - Click group → navigate to group page
  - Fetch group details

- GROUP ACTIONS
  - Add/remove member
  - Edit group
  - View logs

- DATA SYNC
  - API calls to backend
  - UI updates based on response

---

SCREENS AND RESPONSIBILITIES

LOGIN SCREEN

- Email/password input
- Submit → API call
- Error handling
- Redirect on success

---

SIGNUP SCREEN

- Name, email, password
- Trigger OTP flow
- Redirect to verification

---

OTP VERIFICATION SCREEN

- Input OTP
- Verify with backend
- Activate account

---

FORGOT PASSWORD SCREEN

- Input email
- Trigger password reset OTP
- Redirect to reset password page

---

RESET PASSWORD SCREEN

- Input OTP + new password
- Submit to backend
- Redirect to login on success

---

PROFILE SCREEN

- Display user info (name, email)
- Edit name
- Logout button

---

DASHBOARD SCREEN

- List all groups
- Create group button
- Navigate to group

---

CREATE GROUP MODAL / PAGE

- Input group name
- Add initial members
- Submit

---

GROUP DETAIL SCREEN

- Group name
- Members list
- Role badges
- Conditional actions (based on role)

---

MEMBERS SCREEN

- List members
- Add member
- Remove member
- Change roles

---

LOGS SCREEN

- Timeline view
- List of actions
- Sorted by time

---

STATE MANAGEMENT DESIGN

GLOBAL STATE (ZUSTAND)

- Auth state
  - user
  - isAuthenticated

- UI state
  - modals
  - loading states

---

SERVER STATE

- Groups
- Members
- Logs

Handled via:

- Server components (preferred)
- OR client fetching hooks

---

API LAYER DESIGN

CENTRAL API CLIENT

```ts
// lib/api.ts
export const api = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (!res.ok) throw new Error("API Error");
  return res.json();
};
```

---

DATA FETCHING STRATEGY

- Use server components for initial data
- Use client components for interactions
- Revalidate or refetch after mutation

---

AUTHENTICATION HANDLING

- Store access token in httpOnly cookie
- Refresh token stored in httpOnly cookie (separate)
- On 401 response, automatically attempt token refresh
- Use middleware to protect routes

NEXT.JS MIDDLEWARE

```ts
// middleware.ts
- Check auth cookie
- Redirect if not authenticated
```

---

PERMISSION HANDLING (FRONTEND)

- Backend is source of truth
- Frontend only controls UI visibility

Examples:

- Show "Add Member" button only if:
  - role === OWNER or LEADER

- Hide delete button for non-owner

---

ROLE-BASED UI LOGIC

- OWNER
  - Full UI access

- LEADER
  - Limited edit controls

- MEMBER
  - Read-only UI

---

COMPONENT DESIGN

GROUP CARD

- Displays group name
- Clickable

---

MEMBER ITEM

- Name
- Role badge
- Action buttons (conditional)

---

LOG ITEM

- Message
- Timestamp

---

FORM HANDLING

- Use React Hook Form
- Validate with Zod

Example:

```ts
schema = {
  name: string().min(1),
};
```

---

ERROR HANDLING

- Show toast or inline errors
- Handle API failures
- Retry mechanism (optional)

---

LOADING STATES

- Skeleton loaders
- Button loading states
- Page-level loading

---

UI/UX PRINCIPLES

- Minimal design
- Clear hierarchy
- Role visibility
- Fast navigation

---

SECURITY PRACTICES

- Do not store tokens in localStorage
- Always rely on backend validation
- Sanitize inputs

---

INTEGRATION WITH BACKEND

- REST API consumption
- Consistent response format

Example:

```json
{
  "success": true,
  "data": {}
}
```

---

TESTING STRATEGY

- Unit tests for components
- Integration tests for pages
- Use Vitest + React Testing Library

---

ENV VARIABLES (FRONTEND)

```env
NEXT_PUBLIC_API_URL=
```

---

FUTURE EXTENSIONS

- Real-time updates (WebSockets)
- Notifications UI
- Leader system integration
- Offline support

---

DEVELOPMENT PHASES

PHASE 1

- Auth pages + routing

PHASE 2

- Dashboard + group UI

PHASE 3

- Member management

PHASE 4

- Logs + polish

---
