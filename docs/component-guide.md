# 组件开发指南

## 概览

本指南详细说明如何在 ui-component-mcp-server-demo 架构中开发新的 UI 组件。每个组件都遵循统一的消息传递模式，确保系统的一致性和可扩展性。

## 组件架构模式

### 标准组件结构

每个 UI 组件都包含以下四个核心部分：

```
组件名称/
├── mcp-tools/          # MCP 工具定义
├── backend-service/    # 后端业务逻辑
├── frontend-component/ # React 前端组件
└── shared-types/       # 共享类型定义
```

### 消息流程模式

所有组件都遵循相同的消息流程：

```
MCP Tool → Redis Message → Backend Processing → SSE Event → Frontend Update
```

## 开发新组件的步骤

### 第一步：定义组件规范

在开始开发之前，需要明确定义：

1. **组件功能**: 组件要实现什么功能
2. **数据模型**: 组件需要哪些数据结构
3. **操作类型**: 支持哪些操作（增删改查等）
4. **交互方式**: 用户如何与组件交互

#### 示例：图表组件规范

```typescript
// 组件功能：显示和操作数据图表
// 支持操作：更新数据、切换图表类型、应用过滤器
// 数据模型：
interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie';
  data: DataPoint[];
  filters: Filter[];
}

interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
}
```

### 第二步：定义消息类型

在 `shared/types/` 目录下创建组件的消息类型定义：

```typescript
// shared/types/chart.ts
export interface ChartActionMessage extends BaseMessage {
  type: 'chart_action';
  target: 'chart_component';
  payload: {
    action: 'update_data' | 'change_type' | 'apply_filter' | 'reset';
    chartId: string;
    data?: {
      type?: ChartType;
      dataPoints?: DataPoint[];
      filters?: Filter[];
    };
  };
}

export interface ChartStateMessage extends BaseMessage {
  type: 'chart_state';
  payload: {
    chartId: string;
    state: ChartData;
  };
}
```

### 第三步：实现 MCP 工具

在 `mcp-server/src/tools/` 目录下创建组件的 MCP 工具：

```python
# mcp-server/src/tools/chart_tools.py
def register_chart_tools(mcp: FastMCP, redis_client: RedisClient):
    
    @mcp.tool()
    async def update_chart_data(chart_id: str, data_points: list) -> dict:
        """更新图表数据
        
        Args:
            chart_id: 图表ID
            data_points: 新的数据点列表
            
        Returns:
            操作结果
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "chart_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "chart_component",
            "payload": {
                "action": "update_data",
                "chartId": chart_id,
                "data": {
                    "dataPoints": data_points
                }
            }
        }
        
        await redis_client.publish_message("chart:actions", message)
        return {"success": True, "message": f"Chart {chart_id} data updated"}
    
    @mcp.tool()
    async def change_chart_type(chart_id: str, chart_type: str) -> dict:
        """切换图表类型
        
        Args:
            chart_id: 图表ID
            chart_type: 新的图表类型 (line/bar/pie)
            
        Returns:
            操作结果
        """
        if chart_type not in ['line', 'bar', 'pie']:
            return {"success": False, "error": "Invalid chart type"}
            
        message = {
            "id": str(uuid.uuid4()),
            "type": "chart_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "chart_component",
            "payload": {
                "action": "change_type",
                "chartId": chart_id,
                "data": {
                    "type": chart_type
                }
            }
        }
        
        await redis_client.publish_message("chart:actions", message)
        return {"success": True, "message": f"Chart {chart_id} type changed to {chart_type}"}
```

### 第四步：实现后端服务

#### 4.1 创建数据模型

```python
# backend/app/models/chart.py
from typing import List, Optional, Literal
from pydantic import BaseModel

class DataPoint(BaseModel):
    x: str | int
    y: float
    label: Optional[str] = None

class Filter(BaseModel):
    field: str
    operator: Literal['eq', 'gt', 'lt', 'contains']
    value: str | int | float

class ChartData(BaseModel):
    id: str
    title: str
    type: Literal['line', 'bar', 'pie']
    data: List[DataPoint]
    filters: List[Filter] = []
    created_at: int
    updated_at: int
```

#### 4.2 创建业务逻辑服务

```python
# backend/app/services/chart_service.py
class ChartService:
    def __init__(self):
        self.charts: Dict[str, ChartData] = {}
    
    async def get_chart(self, chart_id: str) -> Optional[ChartData]:
        return self.charts.get(chart_id)
    
    async def update_chart_data(self, chart_id: str, data_points: List[DataPoint]) -> Optional[ChartData]:
        chart = self.charts.get(chart_id)
        if not chart:
            return None
        
        chart.data = data_points
        chart.updated_at = int(time.time() * 1000)
        return chart
    
    async def change_chart_type(self, chart_id: str, chart_type: str) -> Optional[ChartData]:
        chart = self.charts.get(chart_id)
        if not chart:
            return None
        
        chart.type = chart_type
        chart.updated_at = int(time.time() * 1000)
        return chart
```

#### 4.3 添加消息处理

在 `backend/app/services/redis_service.py` 中添加图表消息处理：

```python
async def _handle_chart_action(self, message: dict):
    """处理图表操作消息"""
    from ..main import chart_service, sse_service
    
    payload = message.get("payload", {})
    action = payload.get("action")
    chart_id = payload.get("chartId")
    
    try:
        if action == "update_data":
            data_points = payload.get("data", {}).get("dataPoints", [])
            chart = await chart_service.update_chart_data(chart_id, data_points)
            if chart:
                await sse_service.send_event("chart_updated", {"chart": chart.dict()})
        
        elif action == "change_type":
            chart_type = payload.get("data", {}).get("type")
            chart = await chart_service.change_chart_type(chart_id, chart_type)
            if chart:
                await sse_service.send_event("chart_updated", {"chart": chart.dict()})
                
    except Exception as e:
        print(f"Error handling chart action: {e}")
```

#### 4.4 创建 API 路由

```python
# backend/app/routers/charts.py
from typing import List
from fastapi import APIRouter, HTTPException, Request
from ..models.chart import ChartData, DataPoint

router = APIRouter()

@router.get("/charts/{chart_id}", response_model=ChartData)
async def get_chart(chart_id: str, request: Request):
    chart_service = request.app.state.chart_service
    chart = await chart_service.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    return chart

@router.put("/charts/{chart_id}/data")
async def update_chart_data(chart_id: str, data_points: List[DataPoint], request: Request):
    chart_service = request.app.state.chart_service
    sse_service = request.app.state.sse_service
    
    chart = await chart_service.update_chart_data(chart_id, data_points)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    await sse_service.send_event("chart_updated", {"chart": chart.dict()})
    return {"message": "Chart data updated successfully"}
```

### 第五步：实现前端组件

#### 5.1 创建自定义 Hook

```typescript
// frontend/src/hooks/useCharts.ts
import { useState, useEffect } from 'react';
import { ChartData } from '@/types/chart';
import { useSSE } from './useSSE';

export function useCharts() {
  const [charts, setCharts] = useState<Record<string, ChartData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lastEvent } = useSSE();

  // 监听 SSE 事件
  useEffect(() => {
    if (lastEvent?.event === 'chart_updated') {
      const chart = lastEvent.data.chart as ChartData;
      setCharts(prev => ({
        ...prev,
        [chart.id]: chart
      }));
    }
  }, [lastEvent]);

  const updateChart = (chart: ChartData) => {
    setCharts(prev => ({
      ...prev,
      [chart.id]: chart
    }));
  };

  const removeChart = (chartId: string) => {
    setCharts(prev => {
      const newCharts = { ...prev };
      delete newCharts[chartId];
      return newCharts;
    });
  };

  return {
    charts,
    loading,
    error,
    updateChart,
    removeChart
  };
}
```

#### 5.2 创建 React 组件

```typescript
// frontend/src/components/Chart/ChartComponent.tsx
import React, { useState } from 'react';
import { ChartData, DataPoint } from '@/types/chart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChartComponentProps {
  chart: ChartData;
  onUpdateData?: (chartId: string, data: DataPoint[]) => void;
  onChangeType?: (chartId: string, type: string) => void;
}

export function ChartComponent({ chart, onUpdateData, onChangeType }: ChartComponentProps) {
  const [selectedType, setSelectedType] = useState(chart.type);

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    onChangeType?.(chart.id, newType);
  };

  const renderChart = () => {
    switch (chart.type) {
      case 'line':
        return <LineChart data={chart.data} />;
      case 'bar':
        return <BarChart data={chart.data} />;
      case 'pie':
        return <PieChart data={chart.data} />;
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{chart.title}</h3>
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Line</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
            <SelectItem value="pie">Pie</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="chart-container">
        {renderChart()}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        Last updated: {new Date(chart.updated_at).toLocaleString()}
      </div>
    </div>
  );
}
```

#### 5.3 集成到主应用

```typescript
// frontend/src/App.tsx
import { ChartComponent } from '@/components/Chart/ChartComponent';
import { useCharts } from '@/hooks/useCharts';

function App() {
  const { charts } = useCharts();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">UI Component Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(charts).map(chart => (
          <ChartComponent
            key={chart.id}
            chart={chart}
            onUpdateData={handleUpdateData}
            onChangeType={handleChangeType}
          />
        ))}
      </div>
    </div>
  );
}
```

## 最佳实践

### 1. 消息设计原则

- **幂等性**: 相同的消息多次执行应该产生相同的结果
- **原子性**: 每个消息应该代表一个完整的操作
- **可追溯性**: 包含足够的信息用于调试和审计

### 2. 错误处理策略

```typescript
// 前端错误处理
useEffect(() => {
  if (lastEvent?.event === 'error') {
    const error = lastEvent.data;
    if (error.type === 'chart_not_found') {
      setError(`Chart ${error.chartId} not found`);
    }
  }
}, [lastEvent]);
```

```python
# 后端错误处理
try:
    chart = await chart_service.update_chart_data(chart_id, data_points)
    if chart:
        await sse_service.send_event("chart_updated", {"chart": chart.dict()})
    else:
        await sse_service.send_event("error", {
            "type": "chart_not_found",
            "chartId": chart_id,
            "message": "Chart not found"
        })
except Exception as e:
    await sse_service.send_event("error", {
        "type": "internal_error",
        "message": str(e)
    })
```

### 3. 性能优化

- **状态缓存**: 在前端缓存组件状态，减少不必要的重新渲染
- **消息去重**: 基于消息 ID 避免重复处理
- **批量更新**: 合并短时间内的多个更新操作

### 4. 测试策略

```typescript
// 组件测试示例
describe('ChartComponent', () => {
  it('should update chart type when type changes', async () => {
    const mockChart = createMockChart();
    const onChangeType = jest.fn();
    
    render(<ChartComponent chart={mockChart} onChangeType={onChangeType} />);
    
    // 模拟类型切换
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bar' } });
    
    expect(onChangeType).toHaveBeenCalledWith(mockChart.id, 'bar');
  });
});
```

## 组件注册和配置

### 1. 注册新组件

在主应用中注册新组件：

```python
# mcp-server/src/main.py
from .tools.chart_tools import register_chart_tools

async def main():
    # ... 现有代码 ...
    
    # 注册图表工具
    register_chart_tools(mcp, redis_client)
```

```python
# backend/app/main.py
from .services.chart_service import ChartService
from .routers import charts

# 添加服务
chart_service = ChartService()
app.state.chart_service = chart_service

# 添加路由
app.include_router(charts.router, prefix="/api")
```

### 2. 配置消息路由

```python
# backend/app/services/redis_service.py
async def _process_message(self, message: dict):
    message_type = message.get("type")
    
    handlers = {
        "todo_action": self._handle_todo_action,
        "chart_action": self._handle_chart_action,
        # 添加新的处理器...
    }
    
    handler = handlers.get(message_type)
    if handler:
        await handler(message)
    else:
        print(f"Unknown message type: {message_type}")
```

## 部署和维护

### 1. 组件版本管理

为每个组件维护独立的版本：

```json
{
  "components": {
    "todo": "1.0.0",
    "chart": "1.1.0"
  }
}
```

### 2. 监控和日志

```python
# 组件特定的监控
logger.info(f"Chart {chart_id} updated: {action}")
metrics.increment(f"chart.{action}.count")
metrics.timing(f"chart.{action}.duration", duration)
```

### 3. 文档维护

为每个组件维护独立的文档：

```
docs/
├── components/
│   ├── todo-component.md
│   ├── chart-component.md
│   └── ...
└── ...
```

通过遵循这个开发指南，可以确保新组件与现有架构的一致性，同时保持系统的可扩展性和可维护性。
