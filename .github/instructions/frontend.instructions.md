---
description: "Use when: modifying React/Vite/Tailwind frontend files, creating UI components, or fetching data in GreenBit"
globs: "front/**/*.{tsx,ts,jsx,js}"
---
# GreenBit Frontend Guidelines & Rules

## 1. Delegating Score Math to Backend
- **CRITICAL WARNING:** Do not attempt to iterate over score arrays locally in the frontend to find totals or averages.
- The UI relies on endpoints like `getUserTotalScore` and `getUserAverageRating` to populate user profiles and dashboards.
- Always use backend aggregated payload properties.

## 2. Role-Based Payload Interpretation
- The UI outputs depend heavily on User types: `Person`, `Institution`, `Recolector`, `Reciclador`.
- When modifying User Management or Ranking views, validate role conditions. Keep the `User` and `TableUser` interface shapes respected in your services and strictly handle `type` logic.

## 3. Modals and Props Action Strictness
- `RatingModal.tsx`, `ComplaintModal.tsx`, and action modals use `scoreService.createScore()` using IDs from higher-order components.
- Appointment IDs and User IDs must always be passed securely as props derived from the parent state. Never inject loosely coupled IDs into the `createScore` function, as it corrupts the relationship map between citations and users.

## 4. Reports and API Payloads
- Component `ReportesAdmin.tsx` expects highly-specific JSON schemas (`ScoresReport` with `details`, `totalRatings`, normalized limit maxScore=5).
- If you change a frontend chart or graph logic, you must coordinate payload schemas with the backend API.
- **WARNING:** Changing the report APIs will break the frontend charting logic immediately if changes are not mirrored here.

## 5. Dependency Arrays & State Refetching Sync
- Whenever modifying user logic, rankings, or ratings, trigger the parent component's API refetch method inside `useEffect` upon a successful hook response.
- Without refetch calls, the application will display stale data to the client, leading to poor user experience.