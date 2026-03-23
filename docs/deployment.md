# 部署指南

## 概览

本指南详细说明如何部署 ui-component-mcp-server-demo 项目到不同的环境中，包括本地开发、测试环境和生产环境。

## 环境要求

### 系统要求
- **操作系统**: Linux (Ubuntu 20.04+) / macOS / Windows (WSL2)
- **内存**: 最少 4GB，推荐 8GB+
- **存储**: 最少 10GB 可用空间
- **网络**: 稳定的互联网连接

### 软件依赖
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18.0+ (本地开发)
- **Python**: 3.9+ (本地开发)
- **Redis**: 6.0+ (如果不使用 Docker)

## 本地开发环境

### 方式一：Docker Compose (推荐)

#### 1. 克隆项目
```bash
git clone https://github.com/dptech-corp/ui-component-mcp-server-demo.git
cd ui-component-mcp-server-demo
```

#### 2. 配置环境变量
```bash
# 复制环境变量模板
cp frontend/.env.example frontend/.env

# 编辑环境变量 (如果需要)
nano frontend/.env
```

#### 3. 启动所有服务
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 4. 验证部署
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **后端文档**: http://localhost:8000/docs
- **MCP 服务器**: http://localhost:8001
- **Redis**: localhost:6379

#### 5. 停止服务
```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 方式二：本地开发模式

#### 1. 启动 Redis
```bash
# 使用 Docker 启动 Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 或者使用本地安装的 Redis
redis-server
```

#### 2. 启动 MCP 服务器
```bash
cd mcp-server

# 安装依赖
pip install -e .

# 启动服务
python src/main.py
```

#### 3. 启动后端服务
```bash
cd backend

# 安装依赖
poetry install

# 启动开发服务器
poetry run fastapi dev app/main.py
```

#### 4. 启动前端应用
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 生产环境部署

### Docker Compose 生产配置

#### 1. 生产环境配置文件
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - app-network

  mcp-server:
    build: ./mcp-server
    restart: unless-stopped
    environment:
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=INFO
    depends_on:
      - redis
    networks:
      - app-network

  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      - REDIS_URL=redis://redis:6379
      - CORS_ORIGINS=${FRONTEND_URL}
      - LOG_LEVEL=INFO
    depends_on:
      - redis
    networks:
      - app-network

  frontend:
    build: ./frontend
    restart: unless-stopped
    environment:
      - VITE_API_URL=${BACKEND_URL}
      - VITE_SSE_URL=${BACKEND_URL}/events
    depends_on:
      - backend
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

volumes:
  redis_data:

networks:
  app-network:
    driver: bridge
```

#### 2. Nginx 配置
```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # 前端服务
    server {
        listen 80;
        server_name your-domain.com;
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # 后端 API 服务
    server {
        listen 80;
        server_name api.your-domain.com;
        
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # SSE 特殊配置
        location /events {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection '';
            proxy_http_version 1.1;
            chunked_transfer_encoding off;
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 24h;
        }
    }
}
```

## 监控和维护

### 1. 健康检查

#### Docker 健康检查配置
```dockerfile
# backend/Dockerfile 中添加
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

#### 监控脚本
```bash
#!/bin/bash
# scripts/health-check.sh

services=("redis" "mcp-server" "backend" "frontend")

for service in "${services[@]}"; do
    if docker-compose ps $service | grep -q "Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is down"
        # 可以添加重启逻辑或告警
    fi
done
```

### 2. 日志管理

#### 日志配置
```yaml
# docker-compose.prod.yml 中添加日志配置
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### 日志查看命令
```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend

# 查看最近的错误日志
docker-compose -f docker-compose.prod.yml logs --tail=100 backend | grep ERROR
```

### 3. 备份和恢复

#### Redis 数据备份
```bash
#!/bin/bash
# scripts/backup-redis.sh

BACKUP_DIR="/opt/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份 Redis 数据
docker-compose exec redis redis-cli BGSAVE
docker cp $(docker-compose ps -q redis):/data/dump.rdb $BACKUP_DIR/dump_$DATE.rdb

echo "Redis backup completed: $BACKUP_DIR/dump_$DATE.rdb"
```

#### 数据恢复
```bash
#!/bin/bash
# scripts/restore-redis.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# 停止 Redis 服务
docker-compose stop redis

# 恢复数据
docker cp $BACKUP_FILE $(docker-compose ps -q redis):/data/dump.rdb

# 重启 Redis 服务
docker-compose start redis

echo "Redis restore completed"
```

## 性能优化

### 1. Redis 优化配置

```conf
# redis/redis.conf
# 内存优化
maxmemory 256mb
maxmemory-policy allkeys-lru

# 持久化优化
save 900 1
save 300 10
save 60 10000

# 网络优化
tcp-keepalive 300
timeout 0
```

### 2. Nginx 性能优化

```nginx
# nginx/nginx.conf 性能配置
http {
    # 启用 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 缓存配置
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 连接优化
    keepalive_timeout 65;
    keepalive_requests 100;
}
```

### 3. 应用性能监控

#### Prometheus 配置
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: /metrics
    scrape_interval: 5s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

## 安全配置

### 1. 环境变量管理

```bash
# .env.prod
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your_jwt_secret_key
CORS_ORIGINS=https://your-domain.com
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

### 2. SSL/TLS 配置

```nginx
# nginx/nginx.conf SSL 配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 防火墙配置

```bash
# 基本防火墙规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 故障排除

### 常见问题

#### 1. Redis 连接失败
```bash
# 检查 Redis 服务状态
docker-compose ps redis

# 检查 Redis 日志
docker-compose logs redis

# 测试 Redis 连接
docker-compose exec redis redis-cli ping
```

#### 2. SSE 连接中断
```bash
# 检查 Nginx 配置
nginx -t

# 检查后端日志
docker-compose logs backend | grep SSE

# 测试 SSE 端点
curl -N http://localhost:8000/events
```

#### 3. 前端构建失败
```bash
# 检查 Node.js 版本
docker-compose exec frontend node --version

# 重新安装依赖
docker-compose exec frontend npm ci

# 清理缓存
docker-compose exec frontend npm run build --clean
```

### 调试工具

#### 1. 容器调试
```bash
# 进入容器
docker-compose exec backend bash

# 查看容器资源使用
docker stats

# 查看容器网络
docker network ls
docker network inspect ui-component-demo_default
```

#### 2. 性能分析
```bash
# 查看系统资源
htop
iotop
netstat -tulpn
```

## 升级和维护

### 1. 应用升级流程

```bash
#!/bin/bash
# scripts/upgrade.sh

echo "Starting application upgrade..."

# 1. 备份数据
./scripts/backup-redis.sh

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建镜像
docker-compose -f docker-compose.prod.yml build

# 4. 滚动更新
docker-compose -f docker-compose.prod.yml up -d

# 5. 验证服务
./scripts/health-check.sh

echo "Upgrade completed"
```

### 2. 定期维护任务

```bash
# 清理 Docker 资源
docker system prune -f

# 清理旧的备份文件
find /opt/backups -name "*.rdb" -mtime +7 -delete

# 更新系统包
sudo apt update && sudo apt upgrade -y
```

通过遵循这个部署指南，可以确保 ui-component-mcp-server-demo 项目在各种环境中稳定运行，并具备良好的监控、备份和维护能力。
