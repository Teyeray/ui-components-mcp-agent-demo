# 消息流程详细说明

## 概览

ui-component-mcp-server-demo 的核心是一个基于消息传递的架构，通过 Redis Pub/Sub 和 Server-Sent Events (SSE) 实现组件间的实时通信。

## 完整消息流程

### 1. MCP 工具调用阶段

```
外部工具 → MCP Server → 参数验证 → 消息构建 → Redis 发布
```

**详细步骤**:

1. **外部工具调用**: 通过 MCP 协议调用指定的工具函数
   ```python
   # 示例调用
   await mcp_client.call_tool("add_todo", {
       "title": "学习 MCP 协议",
       "description": "深入了解 Model Context Protocol"
   })
   ```

2. **MCP Server 处理**: 
   - 接收并验证调用参数
   - 检查权限和业务规则
   - 生成唯一的消息 ID
   - 构建标准化消息格式

3. **消息发布**: 将消息发布到对应的 Redis 频道
   ```json
   {
     "id": "msg_123456789",
     "type": "todo_action",
     "timestamp": 1703123456789,
     "source": "mcp",
     "target": "todo_component",
     "payload": {
       "action": "add",
       "data": {
         "title": "学习 MCP 协议",
         "description": "深入了解 Model Context Protocol"
       }
     }
   }
   ```

### 2. 后端消息处理阶段

```
Redis 订阅 → 消息解析 → 业务逻辑处理 → 状态更新 → SSE 事件准备
```

**详细步骤**:

1. **Redis 消息订阅**: Backend Service 持续监听相关频道
   ```python
   async def listen_for_messages(self):
       async for message in self.pubsub.listen():
           if message["type"] == "message":
               await self._process_message(json.loads(message["data"]))
   ```

2. **消息路由**: 根据消息类型分发到对应的处理器
   ```python
   message_handlers = {
       "todo_action": self._handle_todo_action,
       "chart_action": self._handle_chart_action,
       # 其他组件处理器...
   }
   ```

3. **业务逻辑执行**: 
   - 验证操作权限
   - 执行具体的业务操作
   - 更新内部状态存储
   - 记录操作日志

4. **SSE 事件构建**: 准备推送给前端的事件数据
   ```json
   {
     "event": "todo_added",
     "data": {
       "todo": {
         "id": "todo_987654321",
         "title": "学习 MCP 协议",
         "description": "深入了解 Model Context Protocol",
         "completed": false,
         "createdAt": 1703123456789,
         "updatedAt": 1703123456789
       }
     }
   }
   ```

### 3. 前端实时更新阶段

```
SSE 连接 → 事件接收 → 数据解析 → 状态同步 → UI 重新渲染
```

**详细步骤**:

1. **SSE 连接建立**: 前端与后端建立持久连接
   ```typescript
   const eventSource = new EventSource('/api/events');
   eventSource.onmessage = (event) => {
       const data = JSON.parse(event.data);
       handleSSEEvent(data);
   };
   ```

2. **事件处理**: 根据事件类型执行相应的状态更新
   ```typescript
   const handleSSEEvent = (eventData: SSEEvent) => {
       switch (eventData.event) {
           case 'todo_added':
               addTodoToState(eventData.data.todo);
               break;
           case 'todo_updated':
               updateTodoInState(eventData.data.todo);
               break;
           case 'todo_deleted':
               removeTodoFromState(eventData.data.todoId);
               break;
       }
   };
   ```

3. **状态同步**: 更新 React 组件状态
   ```typescript
   const [todos, setTodos] = useState<TodoItem[]>([]);
   
   const addTodoToState = (todo: TodoItem) => {
       setTodos(prev => [...prev, todo]);
   };
   ```

4. **UI 重新渲染**: React 自动重新渲染受影响的组件

## 消息格式规范

### 基础消息结构

所有消息都遵循统一的基础结构：

```typescript
interface BaseMessage {
  id: string;           // 唯一消息标识符
  type: string;         // 消息类型
  timestamp: number;    // 时间戳 (毫秒)
  source: 'mcp' | 'backend' | 'frontend';  // 消息来源
  target: string;       // 目标组件
  payload: any;         // 消息载荷
}
```

### Todo 组件消息类型

#### 添加 Todo
```json
{
  "type": "todo_action",
  "payload": {
    "action": "add",
    "data": {
      "title": "任务标题",
      "description": "任务描述"
    }
  }
}
```

#### 更新 Todo
```json
{
  "type": "todo_action",
  "payload": {
    "action": "update",
    "todoId": "todo_123",
    "data": {
      "title": "新标题",
      "completed": true
    }
  }
}
```

#### 删除 Todo
```json
{
  "type": "todo_action",
  "payload": {
    "action": "delete",
    "todoId": "todo_123"
  }
}
```

#### 切换状态
```json
{
  "type": "todo_action",
  "payload": {
    "action": "toggle",
    "todoId": "todo_123"
  }
}
```

## 错误处理机制

### 1. 消息验证失败
- **位置**: MCP Server
- **处理**: 返回错误响应，不发布消息
- **示例**:
  ```json
  {
    "success": false,
    "error": "Invalid title: title cannot be empty"
  }
  ```

### 2. 业务逻辑错误
- **位置**: Backend Service
- **处理**: 发送错误事件到前端
- **示例**:
  ```json
  {
    "event": "error",
    "data": {
      "type": "todo_not_found",
      "message": "Todo item not found",
      "todoId": "todo_123"
    }
  }
  ```

### 3. 连接中断处理
- **SSE 重连**: 前端自动重连机制
- **状态同步**: 重连后获取最新状态
- **消息去重**: 基于消息 ID 避免重复处理

## 性能优化策略

### 1. 消息批处理
合并短时间内的多个消息，减少网络开销：

```python
class MessageBatcher:
    def __init__(self, batch_size=10, timeout=100):  # 100ms
        self.batch = []
        self.batch_size = batch_size
        self.timeout = timeout
        
    async def add_message(self, message):
        self.batch.append(message)
        if len(self.batch) >= self.batch_size:
            await self.flush_batch()
```

### 2. 连接池管理
复用 Redis 连接和 SSE 连接：

```python
class ConnectionPool:
    def __init__(self, max_connections=100):
        self.redis_pool = redis.ConnectionPool(max_connections=max_connections)
        self.sse_connections = set()
        
    async def get_redis_connection(self):
        return redis.Redis(connection_pool=self.redis_pool)
```

### 3. 状态缓存
在 Backend 中缓存组件状态，减少重复计算：

```python
class StateCache:
    def __init__(self):
        self.cache = {}
        self.ttl = 3600  # 1小时
        
    async def get_component_state(self, component_id):
        if component_id in self.cache:
            return self.cache[component_id]
        # 从数据源加载状态
```

## 扩展新组件

### 1. 定义消息类型
在 `shared/types/` 中添加新的消息格式：

```typescript
interface ChartActionMessage extends BaseMessage {
  type: 'chart_action';
  target: 'chart_component';
  payload: {
    action: 'update_data' | 'change_type' | 'apply_filter';
    chartId: string;
    data?: any;
  };
}
```

### 2. 实现 MCP 工具
在 `mcp-server/src/tools/` 中添加工具函数：

```python
@mcp.tool()
async def update_chart_data(chart_id: str, data: dict) -> dict:
    message = {
        "type": "chart_action",
        "payload": {
            "action": "update_data",
            "chartId": chart_id,
            "data": data
        }
    }
    await redis_client.publish_message("chart:actions", message)
    return {"success": True}
```

### 3. 创建后端服务
在 `backend/app/services/` 中实现业务逻辑：

```python
class ChartService:
    async def update_chart_data(self, chart_id: str, data: dict):
        # 实现图表数据更新逻辑
        pass
```

### 4. 开发前端组件
在 `frontend/src/components/` 中创建 React 组件：

```typescript
function ChartComponent() {
    const { charts, updateChart } = useCharts();
    const { lastEvent } = useSSE();
    
    useEffect(() => {
        if (lastEvent?.event === 'chart_updated') {
            updateChart(lastEvent.data.chart);
        }
    }, [lastEvent]);
    
    return <div>图表组件</div>;
}
```

## 监控和调试

### 1. 消息追踪
每个消息都有唯一 ID，可以追踪完整的处理链路：

```
msg_123456789: MCP → Redis → Backend → SSE → Frontend
```

### 2. 性能指标
- 消息处理延迟
- SSE 连接数量
- Redis 队列长度
- 组件状态同步成功率

### 3. 日志记录
```python
logger.info(f"Processing message {message_id}: {message_type}")
logger.debug(f"Message payload: {payload}")
logger.error(f"Failed to process message {message_id}: {error}")
```

## 安全考虑

### 1. 消息验证
- 严格的参数类型检查
- 业务规则验证
- 防止恶意消息注入

### 2. 权限控制
- MCP 调用权限验证
- 组件访问权限检查
- 操作级别的权限控制

### 3. 数据保护
- 敏感数据加密传输
- 消息内容审计
- 防止数据泄露
