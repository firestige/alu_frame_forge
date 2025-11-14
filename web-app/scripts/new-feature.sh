#!/usr/bin/env bash
# 用法: ./scripts/new-feature.sh 19 camera-controls

if [ $# -ne 2 ]; then
    echo "用法: $0 <任务编号> <描述>"
    echo "示例: $0 19 camera-controls"
    exit 1
fi

TASK_NUMBER=$1
DESCRIPTION=$2
BRANCH_NAME="feature/task-$TASK_NUMBER-$DESCRIPTION"

echo "📦 开始新任务 #$TASK_NUMBER"
echo "分支名称: $BRANCH_NAME"

# 确保在 main 分支并拉取最新代码
git checkout main && git pull || exit 1

# 创建并切换到新分支
git checkout -b "$BRANCH_NAME" || exit 1

echo "✅ 分支创建成功！现在可以开始开发了。"
echo ""
echo "完成后运行: ./scripts/finish-feature.sh"
