# Project Assumptions & Constraints

Given the instruction to generate the system immediately, the following "Common Patterns" were assumed as per the prompt instructions:

1. **Stack**: React 18 + TypeScript + Tailwind CSS (Vite/Next pattern).
2. **Backend/DB**: Mocked via `services/db.ts` to simulate an asynchronous Node.js/PostgreSQL environment with Multi-tenancy isolation.
3. **Authentication**: RBAC is implemented with roles: `SUPER_ADMIN`, `CLINIC_ADMIN`, `PROFESSIONAL`, `SECRETARY`. Clinic Context is resolved via `clinicId` in every data object.
4. **Data Isolation**: All "DB" calls filter strictly by `clinicId`.
5. **Agenda Logic**: Atomic conflict detection is simulated in the `createAppointment` function, checking for overlaps `(StartA < EndB) && (EndA > StartB)`.
6. **AI Analysis**: Mocked as a service that returns structured text referencing "Guidelines" (SBD/SBC) to demonstrate the requirement for evidence-based responses.
7. **UX**: Mobile-first, Clean Clinical aesthetic using Tailwind.

## Testing the Prototype
1. **Login**: Use slug `viva` and email `alice@viva.com` (Clinic Admin/Professional) or `sarah@viva.com` (Secretary).
2. **Multi-tenant**: Try logging in with slug `neuro` and email `bob@neuro.com`. You will see different data.
3. **Conflict**: In the Agenda, click the `+` on a slot. Try to click it again quickly or with another user to simulate a conflict (the mock logic prevents overlap).
