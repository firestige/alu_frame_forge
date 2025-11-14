# Git 工作流自动化脚本

基于 Feature Branch + Squash Merge 的工作流，保持 main 分支历史简洁。

## 前置要求

### 1. 安装 GitHub CLI

**Windows (PowerShell):**

```powershell
winget install GitHub.cli
```

**macOS:**

```bash
brew install gh
```

**Linux:**

```bash
# Debian/Ubuntu
sudo apt install gh

# 或使用官方脚本
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
```

### 2. 认证 GitHub CLI

```bash
gh auth login
```

按提示选择：

- GitHub.com
- HTTPS
- Login with a web browser

### 3. 添加脚本执行权限 (macOS/Linux)

```bash
chmod +x scripts/*.sh
```

### 4. Windows 用户配置 (可选)

在 PowerShell 配置文件中添加别名：

```powershell
# 编辑配置文件
notepad $PROFILE

# 添加以下内容
function Start-Feature { bash ./scripts/new-feature.sh @args }
function Finish-Feature { bash ./scripts/finish-feature.sh }
function Merge-PR { bash ./scripts/merge-pr.sh }
function Cleanup-Feature { bash ./scripts/cleanup-feature.sh }
function List-PRs { bash ./scripts/list-prs.sh }

Set-Alias nf Start-Feature
Set-Alias ff Finish-Feature
Set-Alias mp Merge-PR
Set-Alias cf Cleanup-Feature
Set-Alias lp List-PRs
```

保存后重启 PowerShell，即可使用简短命令：

```powershell
nf 19 camera-controls
ff
mp
cf
```

---

## 脚本说明

### 1. `new-feature.sh` - 开始新任务

创建新的 feature 分支并切换。

**用法：**

```bash
./scripts/new-feature.sh <任务编号> <描述>
```

**示例：**

```bash
./scripts/new-feature.sh 19 camera-controls
# 创建分支: feature/task-19-camera-controls
```

**分支命名规范：**

- `feature/task-<编号>-<描述>` - 功能开发
- `fix/task-<编号>-<描述>` - 修复 bug
- `refactor/<描述>` - 重构
- `docs/<描述>` - 文档更新

---

### 2. `finish-feature.sh` - 完成任务并创建 PR

推送当前分支到远程，并自动创建 Pull Request。

**用法：**

```bash
./scripts/finish-feature.sh
```

**功能：**

- 推送当前分支到 GitHub
- 自动创建 PR（基于最近的提交信息）
- PR 标题和描述使用 `--fill` 自动生成

**注意：**

- 必须在 feature 分支上运行
- 确保已有至少一次提交

---

### 3. `merge-pr.sh` - 自动合并 PR (Squash)

在当前 feature 分支上查找对应的 PR 并自动 squash merge。

**用法：**

```bash
./scripts/merge-pr.sh
```

**功能：**

- 查找当前分支的 PR
- 显示 PR 详情供确认
- Squash merge 到 main 分支
- 自动删除远程 feature 分支

**确认提示：**
脚本会显示 PR 内容并要求确认（输入 `y` 继续）。

---

### 4. `cleanup-feature.sh` - 清理本地分支

切换回 main 分支，同步最新代码，删除本地 feature 分支。

**用法：**

```bash
./scripts/cleanup-feature.sh
```

**功能：**

- 切换到 main 分支
- 拉取最新代码（包含刚合并的内容）
- 删除本地 feature 分支

---

### 5. `list-prs.sh` - 查看所有 PR

列出当前仓库所有打开的 Pull Requests。

**用法：**

```bash
./scripts/list-prs.sh
```

---

## 完整工作流程

### 标准流程（使用脚本）

```bash
# 1. 开始新任务
./scripts/new-feature.sh 19 camera-controls

# 2. 开发过程
# ... 修改代码 ...
git add .
git commit -m "feat: 集成 OrbitControls"
# ... 继续修改 ...
git commit -m "fix: 修复缩放范围限制"
git commit -m "docs: 更新文档"

# 3. 完成任务并创建 PR
./scripts/finish-feature.sh

# 4. 自动合并 PR（或在 GitHub 网页上手动合并）
./scripts/merge-pr.sh

# 5. 清理本地分支
./scripts/cleanup-feature.sh
```

### 手动流程（不使用 gh CLI）

如果不想自动合并，可以在步骤 3 后：

1. 访问 GitHub PR 页面
2. 检查代码变更
3. 点击 "Squash and merge"
4. 编辑最终提交信息（保留关键内容）
5. 确认合并
6. 运行 `./scripts/cleanup-feature.sh` 清理

---

## 提交信息规范

每个 feature 分支内的提交可以随意，但最终 squash merge 时建议遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

**格式：**

```
<类型>: <简短描述>

<详细说明>

<可选的脚注>
```

**类型：**

- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构（不改变外部行为）
- `docs`: 文档更新
- `style`: 代码格式（不影响逻辑）
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新

**示例：**

```
feat: 实现 3D 视角控制功能

- 集成 OrbitControls 到 ThreeRenderer
- 添加视角预设（正视图、侧视图、俯视图）
- 实现"重置视角"功能
- 支持键盘快捷键

Closes #19
```

---

## 常见问题

### Q: 如何查看当前分支？

```bash
git branch --show-current
```

### Q: 如何切换回之前的分支？

```bash
git checkout -
```

### Q: PR 创建失败怎么办？

检查：

1. GitHub CLI 是否已认证（`gh auth status`）
2. 当前分支是否已推送到远程
3. 是否有提交内容

### Q: 合并后发现有问题怎么办？

```bash
# 在 main 分支上
git revert HEAD  # 回退最后一次提交
git push
```

### Q: 如何删除远程分支（手动）？

```bash
git push origin --delete feature/task-19-camera-controls
```

### Q: Windows 上运行 .sh 脚本报错？

确保使用 Git Bash 或配置了 WSL：

```powershell
bash ./scripts/new-feature.sh 19 camera-controls
```

---

## 最佳实践

1. **一个任务一个分支** - 保持分支粒度小，易于审查
2. **频繁提交** - 分支内可以随意提交，squash 后只保留一个
3. **及时同步 main** - 长时间开发时，定期从 main 合并更新
4. **描述清晰** - PR 描述应包含任务目标、实现方案、测试情况
5. **先方案后实施** - 重大变更前先讨论方案，获得确认后再开始

---

## 参考资料

- [GitHub CLI 文档](https://cli.github.com/manual/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
