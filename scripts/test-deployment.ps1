# Deployment Test Script
# This script helps verify GitHub push and Railway redeployment

Write-Host "=== SHARE Project Deployment Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Step 1: Check Git Status
Write-Host "Step 1: Checking Git Status..." -ForegroundColor Yellow
git fetch origin
$gitStatus = git status
Write-Host $gitStatus

# Step 2: Check Remote Connection
Write-Host "`nStep 2: Checking Remote Connection..." -ForegroundColor Yellow
$remote = git remote -v
Write-Host $remote

# Step 3: Check Recent Commits
Write-Host "`nStep 3: Recent Commits..." -ForegroundColor Yellow
git log --oneline -5

# Step 4: Check if local is synced with remote
Write-Host "`nStep 4: Checking Sync Status..." -ForegroundColor Yellow
$statusOutput = git status
if ($statusOutput -match "Your branch is up to date") {
    Write-Host "✅ Local branch is synced with remote" -ForegroundColor Green
} else {
    Write-Host "⚠️  Local branch may not be synced with remote" -ForegroundColor Yellow
}

# Step 5: Create test file
Write-Host "`nStep 5: Creating Test File..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$testContent = "# Deployment Test`n`nThis file was created to test GitHub push and Railway redeployment.`n`n**Created:** $timestamp`n`n**Purpose:** Verify that:`n1. GitHub push works correctly`n2. Railway auto-deployment triggers`n3. Both services deploy successfully`n`n**Status:** Test in progress`n"
$testContent | Out-File -FilePath "DEPLOYMENT_TEST.md" -Encoding UTF8
Write-Host "✅ Created DEPLOYMENT_TEST.md" -ForegroundColor Green

# Step 6: Ask user if they want to commit and push
Write-Host "`n=== Ready to Test ===" -ForegroundColor Cyan
Write-Host "A test file (DEPLOYMENT_TEST.md) has been created." -ForegroundColor White
Write-Host ""
$response = Read-Host "Do you want to commit and push this test file? (y/n)"

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "`nStep 6: Staging changes..." -ForegroundColor Yellow
    git add DEPLOYMENT_TEST.md
    Write-Host "✅ Staged DEPLOYMENT_TEST.md" -ForegroundColor Green
    
    Write-Host "`nStep 7: Committing changes..." -ForegroundColor Yellow
    $commitMessage = "Test: Verify GitHub push and Railway redeployment - $timestamp"
    git commit -m $commitMessage
    Write-Host "✅ Committed changes" -ForegroundColor Green
    
    Write-Host "`nStep 8: Pushing to GitHub..." -ForegroundColor Yellow
    $pushResult = git push origin main 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host $pushResult
        
        Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
        Write-Host "1. Check GitHub: https://github.com/thyl1onh3art/SHARE-Project" -ForegroundColor White
        Write-Host "   - Verify DEPLOYMENT_TEST.md appears in the repository" -ForegroundColor Gray
        Write-Host "   - Check the commit appears in the Commits tab" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Check Railway Dashboard: https://railway.app/dashboard" -ForegroundColor White
        Write-Host "   - Wait 1-2 minutes for Railway to detect the push" -ForegroundColor Gray
        Write-Host "   - Check Deployments tab for new deployments" -ForegroundColor Gray
        Write-Host "   - Verify both backend and frontend services deploy" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Monitor Deployment:" -ForegroundColor White
        Write-Host "   - Check deployment logs for errors" -ForegroundColor Gray
        Write-Host "   - Verify deployment status shows 'Active' or 'Deployed'" -ForegroundColor Gray
        Write-Host "   - Test health check endpoints" -ForegroundColor Gray
    } else {
        Write-Host "❌ Push failed!" -ForegroundColor Red
        Write-Host $pushResult
        Write-Host "`nPlease check:" -ForegroundColor Yellow
        Write-Host "- Git credentials are configured correctly" -ForegroundColor White
        Write-Host "- You have push permissions to the repository" -ForegroundColor White
        Write-Host "- Network connection is working" -ForegroundColor White
    }
} else {
    Write-Host "`nTest file created but not committed." -ForegroundColor Yellow
    Write-Host "You can manually commit and push when ready:" -ForegroundColor White
    Write-Host "  git add DEPLOYMENT_TEST.md" -ForegroundColor Gray
    Write-Host "  git commit -m 'Test: Verify deployment'" -ForegroundColor Gray
    Write-Host "  git push origin main" -ForegroundColor Gray
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan

