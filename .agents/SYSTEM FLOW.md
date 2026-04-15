APP OVERVIEW

- A multi-user group management app
- Users can create groups, join groups, and collaborate
- Each group has roles (owner, leader, member)
- Controlled editing via permissions
- All actions are logged for transparency
- Backend-driven (Node/Express or similar) with SQL (likely PostgreSQL)

---

CORE ENTITIES

- USER
  - id
  - name
  - email
  - password (hashed)

- GROUP
  - id
  - name
  - created_at
  - (ownership derived from GROUP_MEMBERS where role = OWNER)

- GROUP_MEMBERS
  - id
  - user_id
  - group_id
  - role (owner | leader | member)

- LOGS
  - id
  - group_id
  - action
  - performed_by
  - target_user_id (nullable — who the action was performed on)
  - message
  - timestamp

---

APP WORKFLOW

- USER ONBOARDING
  - User signs up
  - OTP sent to email for verification
  - User logs in
  - Access token + refresh token issued
  - Refresh token rotation on each refresh

- GROUP CREATION
  - User creates group
  - Automatically becomes OWNER
  - Entry created in GROUP + GROUP_MEMBERS

- GROUP ACCESS
  - User sees all groups they belong to
  - Click → open group details

- GROUP INTERACTION
  - View members
  - Perform actions (based on role)
  - Logs update in real time or on refresh

- LOGGING SYSTEM
  - Every mutation creates a log entry
  - Logs visible to all group members

---

SCREENS REQUIRED

AUTH SCREENS

- LOGIN SCREEN
  - Email + password
  - Redirect to dashboard

- SIGNUP SCREEN
  - Name, email, password

---

MAIN APP SCREENS

- HOME / DASHBOARD
  - List of groups user belongs to
  - Create group button

- CREATE GROUP SCREEN
  - Enter group name
  - Add initial members (optional)

- GROUP DETAIL SCREEN
  - Group name
  - Members list
  - Role badges
  - Actions (based on permission)

- ADD MEMBER SCREEN / MODAL
  - Input email or username
  - Add to group

- LOGS SCREEN
  - Timeline of all actions

- PROFILE SCREEN
  - User info (view/edit)
  - Logout

---

FEATURES

- AUTHENTICATION
  - Signup / login
  - OTP email verification
  - Secure password storage
  - JWT-based sessions (access + refresh token rotation)
  - Forgot password / reset password flow

- GROUP MANAGEMENT
  - Create group
  - Edit group name
  - Delete group

- MEMBER MANAGEMENT
  - Add members
  - Remove members
  - Assign roles (owner/leader/member)

- ROLE-BASED ACCESS CONTROL
  - Actions restricted by role

- ACTIVITY LOGGING
  - Every action recorded
  - Visible to all members

- MULTI-USER SYNC (via backend)
  - Consistent data across users

---

ROLES AND PERMISSIONS

OWNER

- Full control over group
- Can:
  - Edit group name
  - Add/remove members
  - Assign roles
  - Delete group
  - View logs

---

LEADER

- Elevated privileges (but not full control)
- Can:
  - Edit group name
  - Add/remove members
  - View logs

- Cannot:
  - Delete group
  - Change roles
  - Transfer ownership

---

MEMBER

- Basic access
- Can:
  - View group
  - View members
  - View logs

- Cannot:
  - Modify group
  - Add/remove members

---

ROUTE DESIGN (BACKEND API)

AUTH ROUTES

- POST /auth/signup
- POST /auth/login
- POST /auth/verify-otp
- POST /auth/refresh-token
- POST /auth/forgot-password
- POST /auth/reset-password
- POST /auth/logout

---

GROUP ROUTES

- GET /groups
  - Get all groups for logged-in user

- POST /groups
  - Create new group

- GET /groups/:id
  - Get group details

- PUT /groups/:id
  - Update group (name, etc.)

- DELETE /groups/:id
  - Delete group (owner only)

---

MEMBER ROUTES

- POST /groups/:id/members
  - Add member

- DELETE /groups/:id/members/:userId
  - Remove member

- PUT /groups/:id/members/:userId/role
  - Update role

---

LOG ROUTES

- GET /groups/:id/logs
  - Fetch logs (paginated, cursor-based)

---

USER ROUTES

- GET /users/me
  - Get current user profile

- PUT /users/me
  - Update current user profile

---

PERMISSION MIDDLEWARE DESIGN

- Middleware checks:
  - Is user authenticated
  - Is user part of group
  - What is user role in that group

---

EXAMPLE PERMISSION FLOW

- Request → /groups/:id/members
- Middleware:
  - Verify JWT
  - Fetch user role from GROUP_MEMBERS
  - If role != owner/leader → reject

- Else → proceed

---

DATABASE RELATIONSHIPS

- USER ↔ GROUP (many-to-many via GROUP_MEMBERS)
- GROUP ↔ LOGS (one-to-many)

---

IMPORTANT ENGINEERING NOTES

- Always validate role from database, not frontend
- Logs should be written in same transaction as action
- Use indexes on:
  - user_id
  - group_id

- Use foreign keys for integrity
- All list endpoints must support cursor-based pagination
- Expired OTPs must be cleaned up via scheduled job

---

FUTURE EXTENSIONS

- Leader rotation system
- Project sessions inside groups
- Notifications
- Real-time updates (WebSockets)

---
