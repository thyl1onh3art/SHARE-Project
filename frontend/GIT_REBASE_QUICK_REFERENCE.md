# Git Rebase Quick Reference for Railway Deployments

## 🚀 Quick Commands

### Basic Rebase
```bash
# Rebase last N commits
git rebase -i HEAD~3

# Rebase from commit (parent)
git rebase -i <commit-hash>^

# Continue after resolving conflicts
git rebase --continue

# Abort rebase (undo)
git rebase --abort

# Skip current commit
git rebase --skip
```

### Safety First
```bash
# Create backup
git branch backup-$(date +%Y%m%d)

# View reflog (recover lost commits)
git reflog

# Verify before pushing
git log --oneline -5
```

### Force Push
```bash
# Safe force push (recommended)
git push --force-with-lease origin main

# Force push (use with caution)
git push --force origin main
```

## 📝 Rebase Editor Commands

| Command | Short | What It Does |
|---------|-------|--------------|
| `pick` | `p` | Keep commit as-is |
| `reword` | `r` | Change commit message |
| `edit` | `e` | Stop to modify commit |
| `squash` | `s` | Combine with previous commit |
| `fixup` | `f` | Combine, discard message |
| `drop` | `d` | Remove commit |

## 🎯 Common Scenarios

### Make Older Commit HEAD (for Railway)
```bash
# 1. Backup
git branch backup-before-rebase

# 2. Start rebase
git rebase -i HEAD~5

# 3. In editor: Move desired commit line to BOTTOM
# (Bottom = HEAD = what Railway deploys)

# 4. Save and close

# 5. Push
git push --force-with-lease origin main
```

### Remove a Commit
```bash
git rebase -i HEAD~5
# Change 'pick' to 'drop' for unwanted commit
# Save, close, push
```

### Combine Commits
```bash
git rebase -i HEAD~5
# Change all but first to 'squash'
# Save, close, edit combined message, push
```

### Change Commit Message
```bash
git rebase -i HEAD~3
# Change 'pick' to 'reword' for commit
# Save, close, edit message, save, push
```

### Edit Commit Contents
```bash
git rebase -i HEAD~3
# Change 'pick' to 'edit'
# Save, close
# Make changes:
git add <files>
git commit --amend
git rebase --continue
# Push
```

### Reset to Specific Commit (Remove Newer Commits)
```bash
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## 🔧 Troubleshooting

### Conflicts During Rebase
```bash
# 1. See conflicts
git status

# 2. Resolve in files (look for <<<<<<<)

# 3. Stage resolved files
git add <files>

# 4. Continue
git rebase --continue
```

### Rebase Went Wrong
```bash
# Abort rebase
git rebase --abort

# Or restore from backup
git reset --hard backup-before-rebase
```

### Can't Force Push
```bash
# Fetch latest
git fetch origin

# Check what's different
git log origin/main --oneline -5

# Coordinate with team, then:
git push --force-with-lease origin main
```

## 📊 Visual: Commit Order Matters

```
Interactive Rebase Editor:
┌─────────────────────────────────────┐
│ pick abc123 Oldest commit           │ ← Top (oldest)
│ pick def456 Middle commit           │
│ pick ghi789 Newest commit (HEAD)    │ ← Bottom (HEAD)
└─────────────────────────────────────┘
          ↓ (Reorder lines)
┌─────────────────────────────────────┐
│ pick def456 Middle commit           │
│ pick ghi789 Newest commit           │
│ pick abc123 Oldest (now HEAD!)      │ ← Bottom = HEAD
└─────────────────────────────────────┘
```

**Remember:** Bottom commit = HEAD = What Railway Deploys

## ✅ Checklist Before Force Push

- [ ] Created backup branch
- [ ] Verified commit order with `git log`
- [ ] Tested locally (if applicable)
- [ ] Resolved all conflicts
- [ ] Coordinated with team (if shared branch)
- [ ] Ready to use `--force-with-lease`

## 🚨 Common Mistakes to Avoid

1. ❌ Force pushing without backup
2. ❌ Using `--force` instead of `--force-with-lease`
3. ❌ Rebasing commits others have pulled
4. ❌ Not testing after rebase
5. ❌ Forgetting Railway deploys from HEAD (not commit hash)

## 📚 More Help

- Detailed Guide: [`GIT_INTERACTIVE_REBASE_GUIDE.md`](./GIT_INTERACTIVE_REBASE_GUIDE.md)
- Deployment Verification: [`HOW_TO_VERIFY_DEPLOYMENT_COMMIT.md`](./HOW_TO_VERIFY_DEPLOYMENT_COMMIT.md)

