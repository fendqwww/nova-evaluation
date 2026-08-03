# Nova Evaluation — Project Bible & System Context

## 1. Executive Summary & Vision
- **Project:** Nova Evaluation — a high-end, premium Life Operating System.
- **Design Philosophy:** Ultra-minimalist, sleek, modern, ample white space, high precision.
- **Visual Inspiration:** Linear, Vercel, Apple, Arc Browser, OpenAI.
- **UX Goal:** Zero visual clutter, subtle micro-interactions, dark/light mode elegance, high scannability.

---

## 2. Tech Stack
- **Framework:** Next.js (App Router), React, TypeScript (Strict Mode)
- **Styling:** Tailwind CSS, `shadcn/ui` (Radix UI primitives)
- **Animations:** Framer Motion (subtle spring animations, crisp feedback)
- **State & Data Fetching:** Zustand, TanStack Query (React Query)
- **AI Core:** Google Gemini API (`@google/genai`), model `gemini-2.5-flash`, Structured Outputs (`responseSchema`/`responseJsonSchema`)
- **Database & ORM:** PostgreSQL, Prisma ORM (or Supabase)

---

## 3. Core Coding Standards
- **No Water / No Fluff:** Keep code concise, clean, and self-documenting.
- **TypeScript:** Strict typing everywhere. NEVER use `any` or loose `object` types. Define explicit interfaces.
- **Component Design:** Small, modular, single-responsibility components. Clean separation of UI and business logic.
- **Architecture:** Follow Next.js App Router conventions (Server Components by default, `'use client'` only when necessary).
- **Error Handling:** Robust, explicit error boundary handling and clean API response formatting.

---

## 4. UI/UX & Styling Rules
- **Color Palette:** Muted grays, deep blacks, clean whites, high-contrast typography, restrained accent colors.
- **Motion:** Micro-interactions only (100–300ms transitions). Avoid aggressive or distracting animations.
- **Layout:** Generous padding/margins, grid-based alignment, high-end dashboard feel.
- **AI Components:** Chat/Assistant widgets must render structured, card-based outputs rather than wall-of-text responses.

---

## 5. Gemini API & System Prompts Rules
- **Formatting:** Use XML tags (`<context>`, `<instructions>`, `<rules>`, `<output>`) in internal system prompts for maximum steering accuracy.
- **Outputs:** Enforce JSON Schemas via `responseJsonSchema`/Structured Outputs for dynamic UI component rendering.
- **Architecture:** All Gemini access goes through `src/ai/` (`gemini.ts`, `prompts/`, `types.ts`, `limits.ts`, `coach.ts`, `nutrition.ts`, `appearance.ts`) — no feature calls `@google/genai` directly.

---

## 6. Commands & Workflow
- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Typecheck:** `npx tsc --noEmit`