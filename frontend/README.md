# Frontend Application

React 前端应用，提供用户界面并通过 SSE 接收实时更新。

## 功能

- 响应式 Todo List 界面
- 实时接收 SSE 事件更新
- 支持添加、删除、编辑、切换 todo 状态
- 现代化 UI 设计

## 技术栈

- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- shadcn/ui (UI 组件库)
- Lucide React (图标)

## 项目结构

```
src/
├── components/          # React 组件
│   ├── ui/             # shadcn/ui 基础组件
│   └── TodoList/       # Todo 列表组件
├── hooks/              # 自定义 Hooks
│   ├── useSSE.ts       # SSE 连接 Hook
│   └── useTodos.ts     # Todo 状态管理 Hook
├── services/           # API 服务
│   ├── api.ts          # API 客户端
│   └── sse.ts          # SSE 服务
├── types/              # TypeScript 类型定义
│   └── todo.ts         # Todo 相关类型
├── utils/              # 工具函数
└── App.tsx             # 主应用组件
```

## 环境变量

创建 `.env` 文件：

```env
VITE_API_URL=http://localhost:8000
VITE_SSE_URL=http://localhost:8000/events
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 组件说明

### TodoList 组件

主要的 Todo 列表组件，包含：

- **TodoInput**: 添加新 todo 的输入框
- **TodoItem**: 单个 todo 项的显示和编辑
- **TodoStats**: 显示 todo 统计信息

### SSE 集成

通过 `useSSE` Hook 管理 SSE 连接：

```typescript
const { isConnected, lastEvent } = useSSE('/events');
```

支持的 SSE 事件：
- `todo_added`: 新增 todo
- `todo_updated`: 更新 todo
- `todo_deleted`: 删除 todo

### 状态管理

使用 `useTodos` Hook 管理 todo 状态：

```typescript
const { todos, addTodo, updateTodo, deleteTodo, toggleTodo } = useTodos();
```

## Docker

```bash
# 构建镜像
docker build -t frontend-app .

# 运行容器
docker run -p 3000:3000 frontend-app
```

## 部署

```bash
# 构建生产版本
npm run build

# dist/ 目录包含构建后的文件
```
