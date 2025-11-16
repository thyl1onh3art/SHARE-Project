# GitHub Workflow Guide for SHARE Project

This guide explains how to use GitHub to continue building and collaborating on your SHARE Project.

## 📋 Table of Contents
1. [Basic Git Workflow](#basic-git-workflow)
2. [Branching Strategy](#branching-strategy)
3. [Making Changes](#making-changes)
4. [Pull Requests](#pull-requests)
5. [Collaboration](#collaboration)
6. [CI/CD Setup](#cicd-setup)
7. [Best Practices](#best-practices)

---

## 🔄 Basic Git Workflow

### Daily Development Cycle

```bash
# 1. Start your day - get latest changes
git pull origin main

# 2. Create a new branch for your feature
git checkout -b feature/your-feature-name

# 3. Make your changes and commit
git add .
git commit -m "Add: description of your changes"

# 4. Push your branch to GitHub
git push origin feature/your-feature-name

# 5. Create a Pull Request on GitHub (see below)
```

### Common Commands

```bash
# Check current status
git status

# See what branch you're on
git branch

# Switch branches
git checkout branch-name

# See commit history
git log --oneline

# Discard local changes (be careful!)
git checkout -- filename

# Update from remote
git fetch origin
git pull origin main
```

---

## 🌿 Branching Strategy

### Recommended Branch Structure

```
main (production-ready code)
├── develop (integration branch)
├── feature/feature-name (new features)
├── bugfix/bug-name (bug fixes)
└── hotfix/critical-fix (urgent production fixes)
```

### Branch Naming Conventions

- **Features**: `feature/user-authentication`, `feature/payment-integration`
- **Bug Fixes**: `bugfix/login-error`, `bugfix/memory-leak`
- **Hotfixes**: `hotfix/security-patch`, `hotfix/critical-bug`
- **Documentation**: `docs/api-documentation`, `docs/setup-guide`
- **Refactoring**: `refactor/auth-middleware`, `refactor/database-queries`

### Creating and Managing Branches

```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# List all branches
git branch -a

# Delete local branch (after merging)
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature
```

---

## ✏️ Making Changes

### 1. Start a New Feature

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/stripe-payment

# Make your changes in your code editor
# ... edit files ...

# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Add: Stripe payment integration

- Implemented payment processing
- Added error handling
- Updated API endpoints"

# Push to GitHub
git push origin feature/stripe-payment
```

### 2. Commit Message Best Practices

**Good commit messages:**
```
Add: User registration with email verification
Fix: Memory leak in image upload handler
Update: API documentation for events endpoint
Refactor: Authentication middleware for better security
Remove: Deprecated payment method
```

**Bad commit messages:**
```
- "fix"
- "update"
- "changes"
- "asdf"
```

### 3. Working with Multiple Files

```bash
# Stage specific files
git add src/components/Header.tsx
git add src/services/api.ts

# Stage all changes
git add .

# Unstage a file
git reset HEAD filename

# See what's changed
git diff
git diff --staged
```

---

## 🔀 Pull Requests

### Creating a Pull Request

1. **Push your branch to GitHub:**
   ```bash
   git push origin feature/your-feature
   ```

2. **On GitHub:**
   - Go to your repository: https://github.com/thyl1onh3art/SHARE-Project
   - You'll see a banner suggesting to create a PR
   - Click "Compare & pull request"

3. **Fill out the PR template:**
   - **Title**: Clear, descriptive title
   - **Description**: What changes were made and why
   - **Screenshots**: If UI changes
   - **Testing**: How to test the changes
   - **Checklist**: Mark completed items

### PR Template Example

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Added Stripe payment integration
- Updated payment controller
- Added error handling

## Testing
- [ ] Tested locally
- [ ] All tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
```

### Reviewing and Merging

1. **Review the PR:**
   - Check the "Files changed" tab
   - Leave comments on specific lines
   - Request changes if needed

2. **Merge the PR:**
   - Use "Squash and merge" for cleaner history
   - Or "Merge commit" to preserve branch history
   - Delete the branch after merging

---

## 👥 Collaboration

### Working with Team Members

1. **Assign Reviewers:**
   - In PR, assign team members to review
   - Request specific reviewers for their expertise

2. **Code Reviews:**
   - Be constructive and specific
   - Explain why changes are needed
   - Approve when ready

3. **Resolving Conflicts:**
   ```bash
   # If main has new commits, update your branch
   git checkout feature/your-feature
   git pull origin main
   
   # Resolve conflicts in your editor
   # Then commit the merge
   git add .
   git commit -m "Merge main into feature/your-feature"
   git push origin feature/your-feature
   ```

### Issues and Project Management

1. **Create Issues:**
   - Go to "Issues" tab on GitHub
   - Click "New Issue"
   - Use labels: `bug`, `feature`, `enhancement`, `documentation`

2. **Link Issues to PRs:**
   - In PR description: `Closes #123` or `Fixes #123`
   - GitHub will auto-close the issue when PR is merged

3. **Project Boards:**
   - Use GitHub Projects for Kanban boards
   - Track issues and PRs visually

---

## 🚀 CI/CD Setup

### GitHub Actions (Recommended)

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        MONGODB_URI: ${{ secrets.MONGODB_URI }}
        JWT_SECRET: ${{ secrets.JWT_SECRET }}
    
    - name: Lint
      run: npm run lint

  test-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Railway
      # Add your Railway deployment steps here
      # Example: railway up (requires Railway CLI)
      run: echo "Deploying to Railway..."
```

### Setting Up Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `RAILWAY_TOKEN` (if using Railway for deployment)

---

## ✅ Best Practices

### 1. Commit Often, Push Regularly
- Commit small, logical changes
- Push to GitHub daily to backup your work
- Don't wait until everything is perfect

### 2. Keep Branches Short-Lived
- Merge feature branches within a few days
- Avoid long-running branches that diverge from main

### 3. Write Good Commit Messages
- Use imperative mood: "Add feature" not "Added feature"
- First line should be < 50 characters
- Add details in body if needed

### 4. Test Before Pushing
```bash
# Run tests locally
npm test

# Check for linting errors
npm run lint

# Test the build
npm run build
```

### 5. Keep Main Branch Stable
- Never push directly to main
- Always use Pull Requests
- Require reviews for main branch (Settings → Branches)

### 6. Use .gitignore
Make sure sensitive files are ignored:
- `.env` files
- `node_modules/`
- Build artifacts
- IDE files

### 7. Regular Updates
```bash
# Update your local main branch weekly
git checkout main
git pull origin main

# Update your feature branches
git checkout feature/your-feature
git merge main
```

---

## 🛠️ Troubleshooting

### Undo Last Commit (Keep Changes)
```bash
git reset --soft HEAD~1
```

### Undo Last Commit (Discard Changes)
```bash
git reset --hard HEAD~1
```

### Change Last Commit Message
```bash
git commit --amend -m "New message"
```

### Revert a Commit
```bash
git revert <commit-hash>
```

### Stash Changes (Save for Later)
```bash
# Save current changes
git stash

# Apply stashed changes
git stash pop

# List stashes
git stash list
```

---

## 📚 Additional Resources

- [GitHub Docs](https://docs.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Git Flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 🎯 Quick Reference

### Daily Workflow
```bash
git pull origin main                    # Get latest
git checkout -b feature/new-thing       # New feature
# ... make changes ...
git add .                               # Stage changes
git commit -m "Add: new feature"        # Commit
git push origin feature/new-thing       # Push
# Create PR on GitHub
```

### Weekly Maintenance
```bash
git checkout main                       # Switch to main
git pull origin main                    # Update main
git branch -d old-feature               # Clean up merged branches
```

---

**Happy Coding! 🚀**

