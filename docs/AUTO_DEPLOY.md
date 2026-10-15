# 自动部署说明

## GitHub Actions 自动部署

已在 `.github/workflows/deploy.yml` 配置好自动部署流程。

### 触发条件
1. **自动触发**：推送到 `main` 分支时
2. **手动触发**：GitHub Actions 页面点击 "Run workflow"

### 需要配置的 Secrets

在 GitHub 仓库页面 → Settings → Secrets and variables → Actions → New repository secret

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `SERVER_HOST` | 服务器 IP 或域名 | `192.168.1.36` |
| `SERVER_USER` | SSH 用户名 | `root` |
| `SSH_PRIVATE_KEY` | SSH 私钥（用于登录服务器） | 复制 `~/.ssh/id_ed25519` 或 `~/.ssh/myrepo_deploy` 的内容 |
| `TELEGRAM_BOT_TOKEN` | Telegram 机器人 Token | 从 `TELEGRAM_BOT_TOKEN` 环境变量获取 |
| `TELEGRAM_CHAT_ID` | Telegram 聊天 ID | `1926342151` |

### 获取 SSH 私钥

```bash
# 查看已有的部署密钥
cat ~/.ssh/myrepo_deploy
```

或者生成新的：
```bash
ssh-keygen -t ed25519 -C "github-deploy"
# 复制公钥到服务器的 ~/.ssh/authorized_keys
```

### 获取 Telegram Token

```bash
grep TELEGRAM_BOT_TOKEN /root/monitoring/.env
```

### 部署流程

```
push 到 main
    ↓
GitHub Actions 触发
    ↓
SSH 连接到服务器
    ↓
git pull 最新代码
    ↓
rsync src/ 到 /opt/monitoring/compose/
    ↓
docker compose build + up
    ↓
等待容器 healthy
    ↓
Telegram 通知结果
```

### 手动触发

前往 GitHub 仓库 → Actions → Auto Deploy to Production → Run workflow
