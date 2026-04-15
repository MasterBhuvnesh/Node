## CONTEXT

You are working on a project named **Node**.

This project is structured with a clear architectural separation and planning already defined. The planning documents are located inside the `.agents` directory:

- BACKEND PLAN.md
- FRONTEND PLAN.md
- MOBILE PLAN.md
- SYSTEM FLOW.md

These documents define the system design, architecture, workflows, and responsibilities across backend, frontend, and mobile applications.

---

## YOUR TASK

1. **Read and Understand All Planning Files**
   - Carefully go through all files in `.agents`
   - Build a clear mental model of:
     - System architecture
     - Data flow
     - Roles & permissions
     - API structure
     - App workflows

---

## VALIDATION STEP (VERY IMPORTANT)

After reviewing:

- Explain what you understood about the system:
  - Backend architecture
  - Mobile app flow
  - Core features
  - Data models and relationships

- Identify:
  - Any inconsistencies
  - Missing components
  - Over-engineering or under-design
  - Potential scalability or security issues

- If something feels unclear or wrong:
  - **DO NOT proceed silently**
  - Ask the user for clarification
  - Suggest improvements

---

## DEVELOPMENT PRIORITY

Focus on the following order:

1. **BACKEND (FIRST PRIORITY)**
2. **MOBILE APPLICATION (SECOND PRIORITY)**
3. Frontend can be handled later

---

## BACKEND REQUIREMENTS

- Runtime: Bun
- Language: TypeScript
- Framework: Express
- ORM: Prisma
- Database: PostgreSQL (Dockerized)

### MUST INCLUDE

- Dockerfile
- .dockerignore
- Proper environment handling
- Clean architecture (controllers, services, middleware)
- Role-based access control
- Logging system (Winston)
- Observability-ready structure

---

## MOBILE REQUIREMENTS

- React Native (Expo)
- Expo Router (file-based routing)
- NativeWind for styling
- Zustand for state management

---

## DEVELOPMENT PRACTICES

### MULTI-AGENT APPROACH (ALLOWED)

You are allowed to:

- Split responsibilities into multiple agents/modules such as:
  - Auth Agent
  - Group Agent
  - Logging Agent
  - Mobile API Agent

Ensure:

- Clear boundaries
- No duplication
- Shared types/contracts where needed

---

### GIT WORKFLOW

- Commit frequently
- Follow **Conventional Commits**

Examples:

- feat: add auth routes
- fix: handle invalid token
- chore: setup docker
- refactor: simplify group service

Keep commits:

- Short
- Meaningful

---

## CODE QUALITY

- Use professional commenting (JSDoc style)
- Maintain clean separation of concerns
- Avoid tight coupling
- Follow scalable patterns

---

## COMMUNICATION RULES

Before implementing major features:

- Confirm assumptions
- Ask questions if unclear
- Suggest better approaches if needed

---

## FAILURE HANDLING

If:

- Requirements are incomplete
- Architecture has issues
- Something cannot be implemented cleanly

Then:

- Stop
- Explain the issue
- Ask for guidance
- Suggest alternatives

---

## GOAL

Build a **production-grade, scalable system** aligned with the provided architecture, not just a working prototype.

---

## FINAL NOTE

Do not blindly execute.

Think like:

- A backend architect
- A mobile engineer
- A system designer

Challenge decisions when necessary.
