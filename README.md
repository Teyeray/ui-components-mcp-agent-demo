# UI Component MCP Server Demo

这是一个演示项目，展示如何通过 MCP (Model Context Protocol) 协议控制前端组件状态的能力。项目实现了完整的消息流程：MCP 工具调用 → Redis 消息 → 后端处理 → SSE 事件 → 前端更新。

## 项目概述

本项目演示了一个基于 MCP 协议的实时组件状态管理系统，包含以下核心功能：

- **MCP Server**: 处理 MCP 工具调用，生成 Redis 消息
- **Backend**: FastAPI 后端，处理 Redis 消息并通过 SSE 向前端推送更新
- **Frontend**: React 前端，通过 SSE 接收实时更新
- **Redis**: 作为消息通道，连接 MCP 和后端服务
- **Agent**: Google ADK 智能代理，通过自然语言控制 MCP 工具
- **Demo 组件**: 简单的 Todo List，演示完整的消息流程

## 技术架构

### 技术栈
- **前端**: React + TypeScript + Tailwind CSS + shadcn/ui
- **后端**: FastAPI + Python + Pydantic
- **消息通道**: Redis Pub/Sub
- **MCP Server**: fastmcp + Python
- **Agent**: Google ADK (AI Development Kit)
- **容器化**: Docker + Docker Compose

### 消息流程

#### 正向流程（Agent → Frontend）
```
Agent 自然语言指令 → MCP 工具调用 → Redis Pub/Sub 消息 → 后端接收处理 → SSE 事件推送 → 前端组件更新
```

#### 反向流程（Frontend → Agent）
```
前端用户输入 → 后端 API 接收 → Google ADK Agent /run 端点 → Agent 处理响应 → 前端显示结果
```

详细的消息流程说明请参考 [消息流程文档](./docs/message-flow.md)。

## 项目结构

```
ui-component-mcp-server-demo/
├── README.md                    # 项目说明文档
├── ARCHITECTURE.md              # 架构设计文档
├── docker-compose.yml           # Docker 编排配置
├── .gitignore                   # Git 忽略文件配置
├── mcp-server/                  # MCP 服务器
│   ├── src/                     # 源代码
│   ├── pyproject.toml           # Python 项目配置
│   ├── Dockerfile               # Docker 构建文件
│   └── README.md                # MCP 服务器说明
├── agent/                       # Google ADK Agent
│   ├── src/                     # 源代码
│   ├── pyproject.toml           # Python 项目配置
│   ├── Dockerfile               # Docker 构建文件
│   ├── start_web.sh             # 开发模式启动脚本
│   ├── start_api.sh             # API 服务器启动脚本
│   └── README.md                # Agent 说明
├── backend/                     # FastAPI 后端
│   ├── app/                     # 应用代码
│   ├── pyproject.toml           # Python 项目配置
│   ├── Dockerfile               # Docker 构建文件
│   └── README.md                # 后端说明
├── frontend/                    # React 前端
│   ├── src/                     # 源代码
│   ├── package.json             # Node.js 项目配置
│   ├── Dockerfile               # Docker 构建文件
│   └── README.md                # 前端说明
├── shared/                      # 共享类型和常量
│   ├── types/                   # TypeScript 类型定义
│   └── constants/               # 常量定义
└── docs/                        # 项目文档
    ├── message-flow.md          # 消息流程详细说明
    ├── component-guide.md       # 组件开发指南
    └── deployment.md            # 部署指南
```

## 快速开始

### 环境要求
- Docker 和 Docker Compose
- Node.js 18+ (本地开发)
- Python 3.11+ (本地开发)
- Redis (通过 Docker 提供)

### 使用 Docker Compose 启动

1. 克隆项目
```bash
git clone https://github.com/dptech-corp/ui-component-mcp-server-demo.git
cd ui-component-mcp-server-demo
```

2. 启动所有服务
```bash
docker-compose up -d
```

3. 访问应用
- 前端应用: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs
- ADK Agent: http://localhost:8002

### 本地开发模式

详细的本地开发设置请参考 [部署指南](./docs/deployment.md)。

## Demo 功能

### Todo List 组件
项目包含一个简单的 Todo List 组件，演示完整的 MCP 驱动的状态管理：

- **添加任务**: 通过 MCP 工具添加新的 todo 项
- **更新任务**: 修改任务标题、描述或完成状态
- **删除任务**: 移除不需要的任务
- **实时同步**: 所有操作通过 SSE 实时同步到前端

### MCP 工具
MCP Server 提供以下工具：

- `add_todo`: 添加新的 todo 项
- `update_todo`: 更新现有 todo 项
- `delete_todo`: 删除 todo 项
- `toggle_todo`: 切换 todo 完成状态

### 反向消息链路
支持从前端向 Agent 发送消息的双向通信功能：

- **消息输入**: 前端提供消息输入组件
- **消息转发**: 后端 API 转发消息到 Google ADK Agent
- **Agent 处理**: Agent 通过 `/run` 端点处理用户消息
- **响应显示**: 前端显示 Agent 的处理结果
- **会话管理**: 支持基于 sessionId 的会话管理

## 扩展性设计

### 可复用组件
- **消息类型**: 标准化的消息格式，支持不同组件类型
- **消息通道**: Redis Pub/Sub 通道命名规范
- **SSE 连接**: 通用的 SSE 连接管理

### 添加新组件
要添加新的可控制组件，请参考 [组件开发指南](./docs/component-guide.md)。

## 文档

- [架构设计](./ARCHITECTURE.md) - 详细的系统架构说明
- [消息流程](./docs/message-flow.md) - 完整的消息处理流程
- [反向消息链路](./docs/ui-to-agent.md) - 前端到 Agent 的消息设计
- [组件开发指南](./docs/component-guide.md) - 如何开发新的可控制组件
- [部署指南](./docs/deployment.md) - 本地开发和生产部署指南

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

MIT License
