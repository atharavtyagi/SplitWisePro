git update-ref -d HEAD
git rm -r --cached . -q 2>$null

git add backend/ split_commits.ps1
git commit -m "Backend Setup and Features"

git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.* frontend/tailwind.config.js frontend/postcss.config.js frontend/eslint.config.js frontend/.env frontend/.gitignore frontend/README.md frontend/index.html frontend/public/
git commit -m "Frontend Setup and Configuration"

git add .
git commit -m "Frontend UI Components and Application Logic"

git push -f -u origin main
