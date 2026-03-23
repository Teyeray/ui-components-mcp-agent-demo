# Backend Service

FastAPI 后端服务，负责处理业务逻辑、管理组件状态并通过 SSE 推送更新事件。

## 功能

- 订阅 Redis Pub/Sub 消息
- 处理组件业务逻辑
- 管理组件状态
- 通过 SSE 推送实时更新

## API 端点

### SSE 事件流
- `GET /events` - 获取 SSE 事件流

### Todo API
- `GET /api/todos` - 获取所有 todo 项
- `POST /api/todos` - 创建新的 todo 项
- `PUT /api/todos/{todo_id}` - 更新 todo 项
- `DELETE /api/todos/{todo_id}` - 删除 todo 项

### 健康检查
- `GET /health` - 服务健康状态

## 环境变量

- `REDIS_URL` - Redis 连接地址 (默认: redis://localhost:6379)
- `CORS_ORIGINS` - CORS 允许的源地址 (默认: http://localhost:3000)

## 开发

```bash
# 安装依赖
poetry install

# 启动开发服务器
poetry run fastapi dev app/main.py
```

## Docker

```bash
# 构建镜像
docker build -t backend-service .

# 运行容器
docker run -p 8000:8000 -e REDIS_URL=redis://redis:6379 backend-service
```

## 架构

```
Redis Pub/Sub → Message Handler → State Manager → SSE Event Publisher
```

### 组件

1. **Message Handler**: 处理来自 Redis 的消息
2. **State Manager**: 管理组件状态 (内存存储)
3. **SSE Manager**: 管理 SSE 连接和事件推送
4. **Business Logic**: 具体的业务逻辑处理
