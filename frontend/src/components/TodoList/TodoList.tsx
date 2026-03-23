import { useEffect, useState } from 'react';
import { TodoItem } from '@/types/todo';
import { TodoInput } from './TodoInput';
import { TodoItemComponent } from './TodoItem';
import { TodoStats } from './TodoStats';
import { BacklogInput } from './BacklogInput';
import { BacklogItemComponent } from './BacklogItem';
import { TerminalOutput } from './TerminalOutput';
import { useSSE } from '@/hooks/useSSE';
import { useTodos } from '@/hooks/useTodos';

export function TodoList() {
  const { 
    todos, 
    backlogItems, 
    loading, 
    error, 
    addTodo, 
    updateTodo, 
    deleteTodo, 
    toggleTodo, 
    fetchTodos,
    addBacklogItem,
    updateBacklogItem,
    deleteBacklogItem,
    moveToTodo
  } = useTodos();
  const { isConnected, lastEvent } = useSSE();
  const [activeTab, setActiveTab] = useState<'todo' | 'backlog' | 'terminal'>('todo');
  const [terminalCommands, setTerminalCommands] = useState<any[]>([]);

  useEffect(() => {
    if (lastEvent) {
      switch (lastEvent.event) {
        case 'component_switch':
          if (lastEvent.data.component) {
            setActiveTab(lastEvent.data.component as 'todo' | 'backlog' | 'terminal');
          }
          break;
        case 'terminal_command_executed':
          const newCommand = {
            id: `terminal_${Date.now()}`,
            action: lastEvent.data.action,
            command: lastEvent.data.command,
            output: lastEvent.data.output,
            file: lastEvent.data.file,
            timestamp: lastEvent.data.timestamp || Date.now()
          };
          setTerminalCommands(prev => [newCommand, ...prev]);
          break;
        case 'todo_added':
          break;
        case 'todo_updated':
          break;
        case 'todo_deleted':
          break;
      }
    }
  }, [lastEvent]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async (title: string, description?: string) => {
    await addTodo(title, description);
  };

  const handleUpdateTodo = async (id: string, updates: Partial<TodoItem>) => {
    await updateTodo(id, updates);
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
  };

  const handleToggleTodo = async (id: string) => {
    await toggleTodo(id);
  };

  const handleAddBacklogItem = (title: string, description?: string) => {
    addBacklogItem(title, description);
  };

  const handleUpdateBacklogItem = (id: string, updates: Partial<any>) => {
    updateBacklogItem(id, updates);
  };

  const handleDeleteBacklogItem = (id: string) => {
    deleteBacklogItem(id);
  };

  const handleMoveToTodo = async (id: string) => {
    await moveToTodo(id);
  };

  const handleSummarizeTodo = async (todo: TodoItem) => {
    try {
      const message = `分析 ${todo.title} 任务花了多久完成`;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/agent/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message to agent');
      }

      const result = await response.json();
      console.log('Agent response:', result);
      
      alert(`Agent 响应: ${JSON.stringify(result.response)}`);
    } catch (error) {
      console.error('Error calling agent:', error);
      alert('调用 Agent 失败，请稍后重试');
    }
  };

  if (loading && todos.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 连接状态指示器 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Todo 列表</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? '实时连接已建立' : '连接已断开'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('todo')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === 'todo'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Todo
        </button>
        <button
          onClick={() => setActiveTab('backlog')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === 'backlog'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Backlog
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === 'terminal'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Terminal
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">错误</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'todo' ? (
        <>
          {/* 添加新 Todo */}
          <TodoInput onAdd={handleAddTodo} disabled={loading} />

          {/* Todo 统计 */}
          <TodoStats todos={todos} />

          {/* Todo 列表 */}
          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无 Todo 项目</p>
                <p className="text-sm mt-1">添加一个新的 Todo 开始吧！</p>
              </div>
            ) : (
              todos.map((todo) => (
                <TodoItemComponent
                  key={todo.id}
                  todo={todo}
                  onUpdate={handleUpdateTodo}
                  onDelete={handleDeleteTodo}
                  onToggle={handleToggleTodo}
                  onSummarize={handleSummarizeTodo}
                  disabled={loading}
                />
              ))
            )}
          </div>
        </>
      ) : activeTab === 'backlog' ? (
        <>
          {/* 添加新 Backlog */}
          <BacklogInput onAdd={handleAddBacklogItem} disabled={loading} />

          {/* Backlog 列表 */}
          <div className="space-y-2">
            {backlogItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无 Backlog 项目</p>
                <p className="text-sm mt-1">添加一个新的 Backlog 开始吧！</p>
              </div>
            ) : (
              backlogItems.map((item) => (
                <BacklogItemComponent
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdateBacklogItem}
                  onDelete={handleDeleteBacklogItem}
                  onAddToTodo={handleMoveToTodo}
                  disabled={loading}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <TerminalOutput commands={terminalCommands} disabled={loading} />
        </>
      )}

      {activeTab === 'todo' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">MCP 控制提示</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  这个 Todo 列表可以通过 MCP 工具进行控制。尝试使用以下 MCP 命令：
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li><code>add_todo("学习 MCP", "了解 Model Context Protocol")</code></li>
                  <li><code>toggle_todo("todo_id")</code></li>
                  <li><code>delete_todo("todo_id")</code></li>
                  <li><code>update_todo("todo_id", "新的标题", "新的描述")</code></li>
                  <li><code>list_todo()</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'terminal' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Terminal MCP 工具提示</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  这个 Terminal 组件可以通过 MCP 工具执行 Linux 命令。尝试使用以下 MCP 命令：
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li><code>ls()</code> - 列出当前目录文件</li>
                  <li><code>cat_run_sh()</code> - 查看 run.sh 文件内容</li>
                  <li><code>bash_run_sh()</code> - 执行 run.sh 脚本</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
