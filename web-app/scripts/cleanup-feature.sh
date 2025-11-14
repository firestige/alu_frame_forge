#!/usr/bin/env bash

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# 切换回 main
git checkout main || exit 1

# 拉取最新代码
git pull || exit 1

# 删除本地 feature 分支
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "删除本地分支: $CURRENT_BRANCH"
    git branch -d "$CURRENT_BRANCH" 2>/dev/null || git branch -D "$CURRENT_BRANCH"
fi

echo ""
echo "✅ 清理完成！可以开始下一个任务了。"
echo ""
echo "运行: ./scripts/new-feature.sh <编号> <描述>"
