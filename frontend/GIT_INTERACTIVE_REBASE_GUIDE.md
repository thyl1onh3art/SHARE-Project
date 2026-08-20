# Git Interactive Rebase Guide for Railway Deployments

## Table of Contents
1. [Understanding Interactive Rebase](#understanding-interactive-rebase)
2. [Basic Concepts](#basic-concepts)
3. [Interactive Rebase Commands](#interactive-rebase-commands)
4. [Common Scenarios](#common-scenarios)
5. [Step-by-Step Examples](#step-by-step-examples)
6. [Railway-Specific Workflows](#railway-specific-workflows)
7. [Troubleshooting](#troubleshooting)

## Understanding Interactive Rebase

### What is Interactive Rebase?

Interactive rebase (`git rebase -i`) allows you to:
- **Edit commits** - Modify commit messages or contents
- **Reorder commits** - Change the order of commits
- **Combine commits** - Squash multiple commits into one
- **Remove commits** - Drop commits from history
- **Split commits** - Break one commit into multiple

### Why Use It for Railway?

Railway deploys from your branch's HEAD. By rewriting Git history with interactive rebase, you can:
- Change which commit is at the HEAD
- Clean up commit history before deploying
- Remove or modify commits that shouldn't be deployed
- Reorder commits to change deployment order

### Key Principle

**Railway deploys from branch HEAD, not specific commit hashes.**
- When you rewrite history and force-push, the HEAD changes
- Railway automatically detects the new HEAD and redeploys
- Commit hashes change after rebase (they're regenerated)

## Basic Concepts

### Commit Selection Syntax

```bash
# Rebase last N commits
git rebase -i HEAD~3        # Last 3 commits
git rebase -i HEAD~5        # Last 5 commits
git rebase -i HEAD~10       # Last 10 commits

# Rebase from specific commit (exclusive)
git rebase -i d7675161^     # From parent of d7675161
git rebase -i abc1234       # From commit abc1234

# Rebase from branch point
git rebase -i main          # Rebase current branch onto main
```

### The Rebase Editor

When you run `git rebase -i`, Git opens your default editor with a file like this:

```
pick d7675161 Previous commit
pick f396402 Remove arrow indicator
pick af0a7fa Change background to red

# Rebase d7675161..af0a7fa onto abc1234 (3 commands)
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup <commit> = like "squash", but discard this commit's log message
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
# l, label <label> = label current HEAD with a name
# t, reset <label> = reset HEAD to a label
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]
# .       create a merge commit using the original merge commit's
# .       message (or the oneline, if no original merge message was
# .       specified). Use -c <commit> to reword the commit message.
#
# These lines can be re-ordered; they are executed from top to bottom.
#
# If you remove a line here THAT COMMIT WILL BE LOST.
#
# However, if you remove everything, the rebase will be aborted.
```

**Important:** Commits are listed from **oldest to newest** (bottom to top in the list).

## Interactive Rebase Commands

### Command Reference

| Command | Short | Action |
|---------|-------|--------|
| `pick` | `p` | Use commit as-is (no changes) |
| `reword` | `r` | Use commit, but edit commit message |
| `edit` | `e` | Use commit, but stop to allow changes |
| `squash` | `s` | Use commit, combine with previous commit |
| `fixup` | `f` | Like squash, but discard commit message |
| `drop` | `d` | Remove commit entirely |
| `exec` | `x` | Run shell command |
| `break` | `b` | Pause rebase (continue later) |

### Command Details

#### pick
- **Use when:** You want to keep the commit unchanged
- **Example:** `pick d7675161 Previous commit`

#### reword
- **Use when:** You want to change the commit message
- **Example:** `reword f396402 Remove arrow indicator`
- **What happens:** Editor opens to edit the commit message

#### edit
- **Use when:** You want to modify commit contents (add/remove files, change code)
- **Example:** `edit af0a7fa Change background to red`
- **What happens:** 
  - Rebase stops at this commit
  - You can make changes: `git add`, `git commit --amend`
  - Continue with: `git rebase --continue`

#### squash
- **Use when:** You want to combine multiple commits into one
- **Example:** 
  ```
  pick d7675161 First commit
  squash f396402 Second commit
  ```
- **What happens:** Editor opens to create combined commit message

#### fixup
- **Use when:** Like squash, but you don't want to edit the message
- **Example:** 
  ```
  pick d7675161 Main commit
  fixup f396402 Fix typo
  ```
- **What happens:** Commit is combined, original message is kept

#### drop
- **Use when:** You want to remove a commit entirely
- **Example:** `drop f396402 Bad commit`
- **What happens:** Commit is removed from history

## Common Scenarios

### Scenario 1: Change Commit Message

**Goal:** Fix a typo in a commit message

```bash
# 1. Start interactive rebase
git rebase -i HEAD~3

# 2. In editor, change 'pick' to 'reword' for the commit:
reword af0a7fa Change background to red
pick d7675161 Previous commit
pick f396402 Another commit

# 3. Save and close
# 4. New editor opens for the commit message
# 5. Edit message, save and close
# 6. Rebase completes automatically
```

### Scenario 2: Remove a Commit

**Goal:** Remove a commit that shouldn't have been made

```bash
# 1. Start interactive rebase
git rebase -i HEAD~5

# 2. In editor, change 'pick' to 'drop':
pick d7675161 Good commit
drop f396402 Bad commit to remove
pick af0a7fa Another good commit

# 3. Save and close
# 4. Rebase completes, commit is removed
```

### Scenario 3: Combine Multiple Commits

**Goal:** Squash several small commits into one

```bash
# 1. Start interactive rebase
git rebase -i HEAD~5

# 2. In editor, change all but first to 'squash':
pick d7675161 Main feature commit
squash f396402 Fix typo
squash af0a7fa Add comment
squash abc1234 Fix lint error

# 3. Save and close
# 4. Editor opens to create combined commit message
# 5. Edit message, save and close
# 6. All commits are now one commit
```

### Scenario 4: Reorder Commits

**Goal:** Make an older commit the latest (HEAD)

```bash
# 1. Start interactive rebase
git rebase -i HEAD~5

# 2. In editor, reorder the lines:
# Move the commit you want as HEAD to the bottom
pick f396402 Current HEAD
pick af0a7fa Another commit
pick d7675161 Commit to move to HEAD  # Move this line down

# Becomes:
pick f396402 Current HEAD
pick af0a7fa Another commit
pick d7675161 Commit to move to HEAD  # Now at bottom = HEAD

# 3. Save and close
# 4. Commits are reordered, d7675161 is now HEAD
```

### Scenario 5: Edit Commit Contents

**Goal:** Add a file or fix code in a previous commit

```bash
# 1. Start interactive rebase
git rebase -i HEAD~3

# 2. In editor, change 'pick' to 'edit':
pick d7675161 Previous commit
edit af0a7fa Commit to modify
pick f396402 Next commit

# 3. Save and close
# 4. Rebase stops at af0a7fa
# 5. Make your changes:
git add <files>
git commit --amend

# 6. Continue rebase:
git rebase --continue

# 7. If there are more commits, rebase continues
```

## Step-by-Step Examples

### Example 1: Make Commit `d7675161` the HEAD (for Railway)

**Situation:** 
- Current HEAD: `af0a7fa`
- Want HEAD: `d7675161` (older commit)
- History: `d7675161 → f396402 → af0a7fa`

**Steps:**

```bash
# 1. Check current state
git log --oneline -5
# af0a7fa Change background to red (HEAD)
# f396402 Remove arrow indicator
# d7675161 Previous commit
# ...

# 2. Create backup (safety first!)
git branch backup-before-rebase

# 3. Start interactive rebase (rebase last 3 commits)
git rebase -i HEAD~3

# 4. In editor, reorder commits so d7675161 is last:
pick d7675161 Previous commit          # Move this line...
pick f396402 Remove arrow indicator
pick af0a7fa Change background to red  # ...to here

# Becomes:
pick f396402 Remove arrow indicator
pick af0a7fa Change background to red
pick d7675161 Previous commit          # Now at bottom = HEAD

# 5. Save and close editor
# 6. Git will reapply commits in new order
# 7. If conflicts occur, resolve them:
git add <resolved-files>
git rebase --continue

# 8. Verify new HEAD
git log --oneline -3
# d7675161 Previous commit (HEAD) ✓
# af0a7fa Change background to red
# f396402 Remove arrow indicator

# 9. Force push to update Railway
git push --force-with-lease origin main

# 10. Check Railway Deployments tab
# Should show d7675161 as latest deployment
```

### Example 2: Remove Middle Commit

**Situation:**
- Commits: `A → B → C → D`
- Want to remove commit `B`
- Result: `A → C → D`

**Steps:**

```bash
# 1. Check commits
git log --oneline -4
# D Commit D (HEAD)
# C Commit C
# B Commit B (to remove)
# A Commit A

# 2. Backup
git branch backup-before-rebase

# 3. Start interactive rebase
git rebase -i HEAD~4

# 4. In editor, change 'pick' to 'drop' for commit B:
pick A Commit A
drop B Commit B
pick C Commit C
pick D Commit D

# 5. Save and close
# 6. Rebase completes
# 7. Verify
git log --oneline -3
# D Commit D (HEAD)
# C Commit C
# A Commit A
# (B is gone)

# 8. Force push
git push --force-with-lease origin main
```

### Example 3: Combine Fixup Commits

**Situation:**
- Multiple small fix commits after a main feature
- Want to combine them into one clean commit

**Steps:**

```bash
# 1. Check commits
git log --oneline -5
# fix3 Fix another typo (HEAD)
# fix2 Fix typo
# fix1 Add missing import
# feature Main feature commit
# previous Previous commit

# 2. Backup
git branch backup-before-rebase

# 3. Start interactive rebase
git rebase -i HEAD~4

# 4. In editor, squash fix commits into feature:
pick feature Main feature commit
squash fix1 Add missing import
squash fix2 Fix typo
squash fix3 Fix another typo

# 5. Save and close
# 6. Editor opens for combined commit message
# Edit to: "Main feature commit"
# Save and close

# 7. Verify
git log --oneline -2
# feature Main feature commit (HEAD) - contains all fixes
# previous Previous commit

# 8. Force push
git push --force-with-lease origin main
```

## Railway-Specific Workflows

### Workflow 1: Deploy Older Commit

**When:** Railway deployed a commit you don't want, you want an older one

```bash
# 1. Identify commits
git log --oneline -10
# Find the commit hash you want (e.g., d7675161)

# 2. Backup
git branch backup-$(date +%Y%m%d)

# 3. Reset to desired commit (discards newer commits)
git reset --hard d7675161

# 4. Verify
git log --oneline -3

# 5. Force push
git push --force-with-lease origin main

# 6. Monitor Railway
# Check Deployments tab - should show d7675161
```

### Workflow 2: Clean History Before Deployment

**When:** You want to clean up messy commit history before deploying

```bash
# 1. Review commits
git log --oneline -20

# 2. Backup
git branch backup-before-cleanup

# 3. Start interactive rebase
git rebase -i HEAD~20

# 4. In editor:
# - Drop commits that shouldn't be deployed
# - Squash related commits together
# - Reword unclear commit messages
# - Reorder if needed

# 5. Save and close, resolve conflicts as needed

# 6. Verify cleaned history
git log --oneline

# 7. Test locally
npm run build  # or your build command

# 8. Force push
git push --force-with-lease origin main
```

### Workflow 3: Undo Last Commit (But Keep Changes)

**When:** You want to undo the last commit but keep the changes

```bash
# 1. Backup
git branch backup-before-undo

# 2. Reset (soft keeps changes)
git reset --soft HEAD~1

# 3. Changes are now staged, commit again if needed:
git commit -m "New message"

# 4. Force push
git push --force-with-lease origin main
```

### Workflow 4: Split a Large Commit

**When:** One commit has multiple changes that should be separate

```bash
# 1. Start interactive rebase
git rebase -i HEAD~3

# 2. Mark the commit as 'edit':
edit abc1234 Large commit with multiple changes

# 3. Rebase stops, reset to parent:
git reset HEAD~1

# 4. Stage and commit parts separately:
git add file1.js
git commit -m "First part of changes"

git add file2.js file3.js
git commit -m "Second part of changes"

# 5. Continue rebase
git rebase --continue

# 6. Force push
git push --force-with-lease origin main
```

## Troubleshooting

### Problem: Rebase Conflicts

**Symptom:** Rebase stops with conflicts

**Solution:**
```bash
# 1. See which files have conflicts
git status

# 2. Open files, resolve conflicts manually
# Look for <<<<<<< HEAD markers

# 3. Stage resolved files
git add <resolved-files>

# 4. Continue rebase
git rebase --continue

# 5. Repeat if more conflicts
```

### Problem: Rebase Goes Wrong

**Symptom:** You made a mistake during rebase

**Solution:**
```bash
# Abort the rebase (goes back to before rebase started)
git rebase --abort

# Or if you already completed it, restore from backup:
git reset --hard backup-before-rebase
```

### Problem: Editor Doesn't Open

**Symptom:** Rebase command doesn't open editor

**Solution:**
```bash
# Set editor explicitly
git config --global core.editor "code --wait"  # VS Code
git config --global core.editor "notepad"      # Notepad (Windows)
git config --global core.editor "nano"         # Nano
git config --global core.editor "vim"          # Vim
```

### Problem: Can't Force Push

**Symptom:** `--force-with-lease` fails

**Possible causes:**
1. Someone else pushed changes
2. Branch protection rules
3. Authentication issues

**Solution:**
```bash
# 1. Check what's on remote
git fetch origin
git log origin/main --oneline -5

# 2. If someone else pushed, coordinate with them
# 3. Or use --force (dangerous, only if you're sure):
git push --force origin main
```

### Problem: Railway Doesn't Deploy After Force Push

**Symptom:** Force push succeeded, but Railway doesn't deploy

**Solution:**
1. **Wait 30-60 seconds** - Railway needs time to detect changes
2. **Check Railway Settings → Source** - Verify branch connection
3. **Manual redeploy** - Use Railway dashboard to trigger deployment
4. **Check GitHub** - Verify the push actually went through:
   ```bash
   git log origin/main --oneline -3
   ```

### Problem: Lost Commits After Rebase

**Symptom:** Commits are missing after rebase

**Solution:**
```bash
# 1. Find lost commits
git reflog

# 2. Find the commit hash before rebase
# 3. Restore from backup branch or reflog:
git reset --hard backup-before-rebase
# Or:
git reset --hard <commit-hash-from-reflog>
```

## Quick Reference Cheat Sheet

### Basic Commands
```bash
# Start interactive rebase (last N commits)
git rebase -i HEAD~N

# Start interactive rebase (from commit)
git rebase -i <commit-hash>^

# Continue after resolving conflicts
git rebase --continue

# Abort rebase
git rebase --abort

# Skip current commit (during rebase)
git rebase --skip
```

### Common Rebase Operations
```bash
# Change commit message
git rebase -i HEAD~1
# Change 'pick' to 'reword'

# Remove commit
git rebase -i HEAD~N
# Change 'pick' to 'drop'

# Combine commits
git rebase -i HEAD~N
# Change all but first to 'squash'

# Edit commit
git rebase -i HEAD~N
# Change 'pick' to 'edit'
# Make changes, then: git commit --amend
# Then: git rebase --continue
```

### Safety Commands
```bash
# Create backup branch
git branch backup-$(date +%Y%m%d)

# View reflog (find lost commits)
git reflog

# Verify before pushing
git log --oneline -10
git diff origin/main

# Safe force push
git push --force-with-lease origin main
```

## Best Practices

1. **Always create a backup branch** before rebasing
2. **Use `--force-with-lease`** instead of `--force`
3. **Test locally** after rebase, before pushing
4. **Coordinate with team** if branch is shared
5. **Verify commit history** with `git log` before pushing
6. **Use `git reflog`** to recover from mistakes
7. **Rebase small batches** (5-10 commits at a time) to avoid conflicts
8. **Keep commits focused** - one logical change per commit
9. **Write clear commit messages** - easier to understand during rebase
10. **Don't rebase commits** that others have already pulled

## Additional Resources

- Git Official Docs: https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History
- Interactive Rebase: https://git-scm.com/docs/git-rebase
- Railway Deployment Docs: https://docs.railway.app/

