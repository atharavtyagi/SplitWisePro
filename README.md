# SplitWise Pro AI

SplitWise Pro AI is a modern, full-stack shared expenses management platform. It allows users to create groups, add expenses, split bills (equally, exact amounts, percentages, or shares), and automatically calculate settlements. It also features an intelligent CSV import engine that detects anomalies and a Gemini AI assistant for natural language queries and categorization.

## Tech Stack
**Backend**: Django, Django REST Framework, PostgreSQL, Redis, Celery, Google Generative AI (Gemini).
**Frontend**: React 19, Vite, Tailwind CSS 4, React Router, React Query, Radix UI, Framer Motion.

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, defaults to SQLite for local dev)
- Redis (optional, for Celery/caching)
- Gemini API Key

### Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and configure your keys (e.g., `GEMINI_API_KEY`).
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser (typically `http://localhost:5173`).

## AI Used
- **Google Gemini**: Used to generate the codebase, design the anomaly engine, create the user interface, and structure the API.
- **Antigravity Agent**: Acted as the pair-programmer to iteratively build out the backend logic, frontend components, and database models.
