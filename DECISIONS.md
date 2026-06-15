# Decision Log

This document records the significant architectural and design decisions made during the development of SplitWise Pro AI.

## 1. Backend Framework
**Decision**: Use Django and Django REST Framework (DRF) instead of Node.js/Express.
**Options Considered**: 
- Node.js with Express/NestJS and Prisma ORM
- Python with FastAPI
- Python with Django
**Reasoning**: Django provides a robust, built-in ORM, excellent migration management, and an out-of-the-box admin panel. Since handling financial data (expenses, settlements, splits) requires strict database integrity and complex relational queries, Django's ORM was the safest and fastest choice. DRF makes it trivial to expose these models securely.

## 2. Frontend Architecture
**Decision**: Use React 19 with Vite and Tailwind CSS.
**Options Considered**:
- Next.js (Server-Side Rendering)
- Create React App (Deprecated)
- Vue.js / Svelte
**Reasoning**: The app is heavily interactive and state-driven, making it a perfect fit for a Single Page Application (SPA). Vite provides incredibly fast hot-module reloading compared to CRA or Webpack. Next.js was considered, but server-side rendering is not strictly necessary for an authenticated dashboard app where SEO on user data isn't relevant. Tailwind CSS was chosen for rapid UI development without writing custom CSS classes.

## 3. CSV Import Strategy
**Decision**: Interactive anomaly resolution via database logging.
**Options Considered**:
- Fail the entire import if any row is invalid (Strict).
- Silently skip invalid rows and import the rest (Lenient).
- Parse everything, save valid rows directly, and present errors for manual fix (Interactive).
**Reasoning**: Real-world CSVs from banks or manual entry are notoriously messy. Failing the whole file frustrates users. Silently skipping rows loses data. We decided to parse the file, detect anomalies, log them to the `ImportAnomaly` database table, and block the import until the user reviews and makes a decision (e.g., "Merge", "Skip", "Accept") on each flagged row.

## 4. Split Engine Design
**Decision**: Store computed exact amounts for every user per expense, regardless of split type.
**Options Considered**:
- Store the split logic (e.g., "50% Alice, 50% Bob") and compute amounts dynamically on read.
- Compute the exact monetary share at the time of creation and store it in `ExpenseParticipant`.
**Reasoning**: Financial calculations are sensitive to rounding errors (e.g., splitting $10.00 three ways). By computing the exact amounts at write-time (storing $3.34, $3.33, $3.33) and persisting them, we avoid floating-point discrepancies during balance calculations and make read queries (like "How much do I owe?") much faster and simpler.

## 5. AI Integration
**Decision**: Google Generative AI (Gemini) SDK on the Backend.
**Options Considered**:
- OpenAI API
- Anthropic Claude API
- Local LLMs
**Reasoning**: Gemini provides excellent context windows and fast inference, making it ideal for tasks like categorizing expenses ("Uber" -> "Transport") and generating human-readable explanations for CSV anomalies. Moving the integration to the backend securely hides the API key and allows us to cache responses in Redis.
