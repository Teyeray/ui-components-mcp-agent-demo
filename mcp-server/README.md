# MCP Server

MCP (Model Context Protocol) 服务器组件，负责接收外部工具调用并转换为内部消息。

## 功能

- 接收 MCP 协议调用
- 验证调用参数和权限
- 转换为标准化内部消息格式
- 发布消息到 Redis Pub/Sub 频道

## 支持的工具

### Todo 组件工具

- `add_todo(title: str, description: str = "")` - 添加新的 todo 项
- `delete_todo(todo_id: str)` - 删除指定的 todo 项
- `update_todo(todo_id: str, title: str = None, description: str = None)` - 更新 todo 项
- `toggle_todo(todo_id: str)` - 切换 todo 完成状态

## 环境变量

- `REDIS_URL` - Redis 连接地址 (默认: redis://localhost:6379)
- `MCP_PORT` - MCP 服务器端口 (默认: 8001)

## 开发

```bash
# 安装依赖
pip install -e .

# 启动服务
python src/main.py
```

## Docker

```bash
# 构建镜像
docker build -t mcp-server .

# 运行容器
docker run -p 8001:8001 -e REDIS_URL=redis://redis:6379 mcp-server
```
