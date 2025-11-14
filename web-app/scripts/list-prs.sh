#!/usr/bin/env bash

echo "📋 当前打开的 Pull Requests:"
gh pr list

echo ""
echo "查看详情: gh pr view <编号>"
echo "合并 PR: ./scripts/merge-pr.sh (在对应分支上)"
