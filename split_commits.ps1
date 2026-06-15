git update-ref -d HEAD
git rm -r --cached . -q 2>$null

git add backend/manage.py backend/requirements.txt backend/config/
git commit -m "Initialize Django backend and configuration"

git add backend/users/
git commit -m "Add users app and authentication models"

git add backend/groups/
git commit -m "Add groups app for expense sharing groups"

git add backend/expenses/
git commit -m "Add expenses app for core expense tracking"

git add backend/settlements/
git commit -m "Add settlements app for resolving balances"

git add backend/notifications/
git commit -m "Add notifications app"

git add backend/audit/
git commit -m "Add audit app for tracking changes"

git add backend/imports/ backend/db.sqlite3
git commit -m "Add imports app and database setup"

git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.* frontend/tailwind.config.js frontend/postcss.config.js frontend/eslint.config.js frontend/.env frontend/.gitignore frontend/README.md frontend/index.html
git commit -m "Initialize React frontend with Vite and Tailwind"

git add frontend/public/ frontend/src/assets/ frontend/src/types/ frontend/src/index.css frontend/src/App.css
git commit -m "Add frontend assets, types, and base styles"

git add frontend/src/lib/ frontend/src/contexts/
git commit -m "Add frontend utilities and React contexts"

git add frontend/src/components/ui/
git commit -m "Add reusable UI components"

git add frontend/src/components/layout/ frontend/src/components/BalanceExplainModal.tsx frontend/src/components/CommandPalette.tsx
git commit -m "Add layout components and global modals"

git add frontend/src/pages/auth/ frontend/src/pages/Dashboard.tsx frontend/src/pages/ProfilePage.tsx
git commit -m "Add authentication and dashboard pages"

git add frontend/src/pages/ frontend/src/App.tsx frontend/src/main.tsx
git commit -m "Add remaining pages and application entry point"

if (git status --porcelain) { git add .; git commit -m "Add remaining miscellaneous files" }

git push -f -u origin main
