# GitHub Quick Start Guide

## 🚀 Getting Started with GitHub Workflow

Your code is already on GitHub at: `https://github.com/thyl1onh3art/SHARE-Project.git`

### Daily Development Workflow

```bash
# 1. Get the latest code
git pull origin main

# 2. Create a new branch for your feature
git checkout -b feature/your-feature-name

# 3. Make your changes (edit files in your editor)

# 4. Save your changes to Git
git add .
git commit -m "Add: description of what you did"

# 5. Push to GitHub
git push origin feature/your-feature-name

# 6. Go to GitHub and create a Pull Request
# Visit: https://github.com/thyl1onh3art/SHARE-Project
```

### Creating Your First Pull Request

1. **After pushing your branch**, go to: https://github.com/thyl1onh3art/SHARE-Project
2. You'll see a yellow banner saying "Compare & pull request"
3. Click it and fill out the PR form
4. Add a description of your changes
5. Click "Create pull request"
6. Review your changes in the "Files changed" tab
7. When ready, merge the PR

### Branch Protection (Recommended)

Protect your `main` branch:
1. Go to: Settings → Branches
2. Add rule for `main` branch
3. Enable "Require pull request reviews"
4. Enable "Require status checks to pass"

### Setting Up CI/CD

The GitHub Actions workflow is already created at `.github/workflows/ci.yml`

**To enable it:**
1. Go to: Settings → Secrets and variables → Actions
2. Add these secrets (optional, for full testing):
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Your JWT secret key
   - `REACT_APP_API_URL` - Your API URL

The workflow will automatically run tests when you push code or create PRs.

### Common Commands Cheat Sheet

```bash
# See what files changed
git status

# See what branch you're on
git branch

# Switch to main branch
git checkout main

# Create and switch to new branch
git checkout -b feature/new-feature

# Discard uncommitted changes (be careful!)
git checkout -- filename

# Update your branch with latest main
git checkout feature/your-feature
git merge main
```

### Next Steps

1. ✅ Read the full guide: [GITHUB_WORKFLOW_GUIDE.md](./GITHUB_WORKFLOW_GUIDE.md)
2. ✅ Make your first feature branch
3. ✅ Create your first Pull Request
4. ✅ Set up branch protection
5. ✅ Configure GitHub Actions secrets (optional)

### Need Help?

- Full workflow guide: [GITHUB_WORKFLOW_GUIDE.md](./GITHUB_WORKFLOW_GUIDE.md)
- GitHub Docs: https://docs.github.com/
- Git Cheat Sheet: https://education.github.com/git-cheat-sheet-education.pdf

---

**Happy Coding! 🎉**

