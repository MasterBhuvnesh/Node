MOBILE APPLICATION ARCHITECTURE OVERVIEW

- App Name: Node
- Framework: Expo (React Native)
- Routing: Expo Router
- Language: TypeScript
- Styling: NativeWind
- State Management: Zustand
- Networking: fetch / axios
- Logging: Winston (adapted)

---

ROUTING ARCHITECTURE (EXPO ROUTER BASED)

- File-based routing (like Next.js)
- Navigation handled by folder structure inside `app/`

---

ROUTE GROUPS (LOGICAL STRUCTURE)

AUTH ROUTES

- /login
- /signup
- /otp
- /forgot-password
- /reset-password

---

APP ROUTES (PROTECTED)

- /(app)/home
- /(app)/profile
- /(app)/group/[groupId]
- /(app)/group/[groupId]/members
- /(app)/group/[groupId]/logs

---

ROOT ROUTING FLOW

- App starts
- Check authentication state
- If not authenticated → redirect to /login
- If authenticated → redirect to /(app)/home

---

NAVIGATION FLOW

- LOGIN → HOME
- SIGNUP → OTP → HOME
- LOGIN → FORGOT PASSWORD → RESET PASSWORD → LOGIN
- HOME → GROUP DETAIL
- HOME → PROFILE
- GROUP DETAIL → MEMBERS / LOGS

---

AUTHENTICATION FLOW (MOBILE)

- SIGNUP
  - Input user details
  - Call backend
  - Receive OTP trigger

- OTP VERIFICATION
  - Enter OTP
  - Verify account

- LOGIN
  - Validate credentials
  - Receive JWT

- SESSION HANDLING
  - Store tokens securely using expo-secure-store
  - Attach access token in API requests
  - Use refresh token to silently renew expired access tokens

---

STATE MANAGEMENT DESIGN

ZUSTAND STORES

AUTH STORE

- user
- accessToken
- refreshToken
- isAuthenticated
- login / logout / refreshSession actions

---

GROUP STORE

- groups list
- selected group
- loading states

---

APP WORKFLOW

- USER LOGIN
  - Token stored
  - Navigate to home

- DASHBOARD (HOME)
  - Fetch user groups
  - Display list

- GROUP INTERACTION
  - Open group
  - Perform actions based on role

- LOG VISIBILITY
  - Logs fetched per group
  - Display timeline

---

SCREENS AND RESPONSIBILITIES

LOGIN SCREEN

- Email/password input
- API call
- Error handling
- Redirect on success

---

SIGNUP SCREEN

- Name/email/password
- Trigger OTP

---

OTP SCREEN

- OTP input
- Verification API
- Redirect to home

---

FORGOT PASSWORD SCREEN

- Input email
- Trigger password reset OTP
- Navigate to reset password screen

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

HOME SCREEN

- List all groups
- Create group button
- Pull-to-refresh

---

GROUP DETAIL SCREEN

- Group name
- Member preview
- Conditional actions
- Navigation to members/logs

---

MEMBERS SCREEN

- Full member list
- Role badges
- Add/remove member
- Role updates (based on permission)

---

LOGS SCREEN

- Timeline of actions
- Sorted by time

---

PERMISSION HANDLING (UI LEVEL)

- Backend is source of truth
- Frontend controls visibility only

---

ROLE-BASED UI RULES

OWNER

- Full UI access
- Can see all action buttons

---

LEADER

- Partial access
- Can edit group and members

---

MEMBER

- Read-only
- No edit controls

---

API INTEGRATION DESIGN

CENTRAL API HANDLER

- Handles:
  - Base URL
  - Headers
  - Access token injection
  - Automatic token refresh on 401 responses
  - Cursor-based pagination support

---

REQUEST FLOW

- UI Action → Service Layer → API Call → Response → Update State

---

ERROR HANDLING

- API errors → show alerts/toasts
- Network issues → retry option
- Graceful UI fallback

---

LOADING STATES

- Screen loaders
- Button loading indicators
- Pull-to-refresh

---

STYLING SYSTEM (NATIVEWIND)

- Utility-based styling
- Consistent spacing and layout
- Reusable UI patterns

---

LOGGING SYSTEM (MOBILE)

WINSTON (ADAPTED)

- Log levels:
  - info
  - warn
  - error

- Development:
  - console logging

---

SECURITY PRACTICES

- Store tokens securely using expo-secure-store (NOT AsyncStorage)
- Do not expose sensitive data
- Always validate via backend
- Refresh token rotation — on each refresh, old token is invalidated

---

OBSERVABILITY (MOBILE SIDE)

- Basic logging for debugging

---

DATA CONSISTENCY

- Always fetch fresh data after mutations
- Avoid stale UI
- Optional caching for performance

---

DEVELOPMENT PHASES

PHASE 1

- Expo Router setup + auth flow

PHASE 2

- Home + group screens

PHASE 3

- Member management

PHASE 4

- Logs + polish

---
