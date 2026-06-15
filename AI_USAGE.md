# AI Usage Log

## AI Tools Used
- **Google Gemini 3.1 Pro (via Antigravity Agent)**: Pair programming, architecture design, database modeling, frontend component generation, and debugging.
- **GitHub Copilot** (if applicable): Inline code completion and boilerplate generation.

## Key Prompts Used
1. *"Build a production-ready, full-stack Shared Expenses Management Platform called SplitWise Pro AI based on Django, React 19, and Tailwind CSS 4."*
2. *"Create an extensible anomaly detection engine in Python to validate CSV uploads of expenses. It should catch negative amounts, missing fields, future dates, duplicate entries, and incorrect split math."*
3. *"Write a React component using Radix UI for an interactive data table that lets the user review CSV import anomalies and select actions like 'Merge', 'Ignore', or 'Keep First'."*

## Concrete Cases of AI Errors and Corrections

### Case 1: Incorrect PostgreSQL Package
**What the AI produced:** The AI generated a `requirements.txt` file that included `psycopg2`.
**Why it was wrong:** On Windows and macOS, installing `psycopg2` from source often fails because it requires local C compilers and PostgreSQL development headers to be installed on the system.
**How I caught it:** Running `pip install -r requirements.txt` resulted in a massive build error related to `pg_config`.
**What I changed:** I updated `requirements.txt` to use the pre-compiled binary package instead: `psycopg2-binary`.

### Case 2: Outdated Tailwind CSS Configuration
**What the AI produced:** The AI provided a setup for Tailwind CSS using a `tailwind.config.js` file and an old PostCSS configuration setup standard for Tailwind v3.
**Why it was wrong:** The project was specifically using Vite and the new Tailwind CSS v4 alpha/beta, which handles configuration differently (often relying on CSS `@theme` directives) or requires the `@tailwindcss/postcss` plugin instead of `tailwindcss` directly in PostCSS.
**How I caught it:** Running `npm run dev` threw errors indicating that PostCSS couldn't resolve the Tailwind plugin correctly, and styles were not applying.
**What I changed:** I updated `postcss.config.js` to use the correct `@tailwindcss/postcss` plugin as per v4 documentation, and removed obsolete settings from Vite and Tailwind configs.

### Case 3: Missing Dependency Array in React Hook
**What the AI produced:** The AI wrote a `useEffect` hook to fetch anomaly data from the backend when the Import Review page loaded, but omitted the dependency array.
```javascript
useEffect(() => {
    fetchAnomalies();
});
```
**Why it was wrong:** Without the dependency array, the effect runs after *every* render. Because `fetchAnomalies` updated the state, it triggered a re-render, creating an infinite loop of network requests to the backend.
**How I caught it:** When opening the page locally, the browser tab froze and the backend terminal showed hundreds of rapid `GET /api/imports/anomalies/` requests per second.
**What I changed:** I added the empty dependency array `[]` so the fetch only occurs once when the component mounts.
```javascript
useEffect(() => {
    fetchAnomalies();
}, []);
```
