#!/bin/bash
# Script to finalize the branch, update Main and perform cleanup.
# Usage: ./finalize_dev.sh <branch_name>

BRANCH_NAME=$1

if [ -z "$BRANCH_NAME" ]; then
  echo "Usage: $0 <branch_name>"
  exit 1
fi

echo "--- Finalizing branch: $BRANCH_NAME ---"

# Ensure we are on the branch
git checkout $BRANCH_NAME

# Pull latest origin main to ensure no merge conflicts
git fetch origin
git merge origin/main

# Push the branch to origin
git push origin $BRANCH_NAME

# Merge to main via gh (requires gh CLI authenticated)
gh pr create --base main --head $BRANCH_NAME --title "Merge $BRANCH_NAME into main" --body "Finalizing branch $BRANCH_NAME."
gh pr merge --squash --delete-branch --admin

echo "--- Branch $BRANCH_NAME merged into main and cleaned up. ---"
