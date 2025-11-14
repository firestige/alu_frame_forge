#!/usr/bin/env bash

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "❌ 当前在 main 分支，请先切换到 feature 分支"
    exit 1
fi

echo "🚀 准备完成任务: $CURRENT_BRANCH"

# 推送到远程
echo "推送分支到远程..."
git push -u origin "$CURRENT_BRANCH" || exit 1

echo ""
echo "✅ 分支已推送！正在创建 Pull Request..."
echo ""

# 使用 gh 创建 PR（自动启用 Squash merge）
gh pr create --fill --base main || exit 1

echo ""
echo "📝 下一步操作:"
echo "1. 检查 PR 内容"
echo "2. 运行: ./scripts/merge-pr.sh (自动 squash merge)"
echo "   或者在 GitHub 网页上手动合并"
