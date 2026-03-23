import { TodoList } from '@/components/TodoList/TodoList';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './App.css';

function App() {
  return (
    <div className="h-screen bg-gray-50">
      <PanelGroup direction="horizontal" className="h-full">
        <Panel defaultSize={60} minSize={30}>
          <div className="h-full overflow-auto">
            <div className="container mx-auto px-4 py-8">
              <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  UI Component MCP Demo
                </h1>
                <p className="text-lg text-gray-600">
                  演示通过 MCP 协议控制前端组件状态的能力
                </p>
              </header>

              <main className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Todo List 组件
                  </h2>
                  <p className="text-gray-600 mb-6">
                    这个 Todo List 组件可以通过 MCP 工具进行控制，展示了完整的消息流程：
                    MCP 调用 → Redis 消息 → 后端处理 → SSE 事件 → 前端更新
                  </p>
                  <TodoList />
                </div>
              </main>

              <footer className="text-center mt-12 text-gray-500">
                <p>
                  基于 React + FastAPI + Redis + MCP 的实时组件状态管理演示
                </p>
              </footer>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-gray-400 transition-colors cursor-col-resize" />

        <Panel defaultSize={40} minSize={20}>
          <div className="h-full p-4">
            <div className="h-full bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-gray-700">Dev UI</h3>
              </div>
              <iframe
                src="http://localhost:8002/dev-ui/"
                className="w-full h-full border-0"
                title="Dev UI"
              />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
