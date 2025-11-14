#!/usr/bin/env bash

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "❌ 当前在 main 分支，请先切换到 feature 分支"
    exit 1
fi

echo "🔍 查找当前分支的 PR..."

# 获取当前分支的 PR 编号
PR_NUMBER=$(gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number')

if [ -z "$PR_NUMBER" ]; then
    echo "❌ 未找到当前分支的 PR"
    exit 1
fi

echo "找到 PR #$PR_NUMBER"
echo ""

# 显示 PR 信息
gh pr view "$PR_NUMBER"

echo ""
echo "确认合并？(y/n)"
read -r CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "取消合并"
    exit 0
fi

# Squash merge
gh pr merge "$PR_NUMBER" --squash --delete-branch || exit 1

echo ""
echo "✅ PR 已合并并删除远程分支！"
echo ""
echo "运行清理脚本: ./scripts/cleanup-feature.sh"
