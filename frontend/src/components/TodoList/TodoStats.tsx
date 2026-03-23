import { TodoItem } from '@/types/todo';

interface TodoStatsProps {
  todos: TodoItem[];
}

export function TodoStats({ todos }: TodoStatsProps) {
  const total = todos.length;
  const completed = todos.filter(todo => todo.completed).length;
  const pending = total - completed;

  if (total === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-600">总计</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{completed}</div>
          <div className="text-sm text-gray-600">已完成</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{pending}</div>
          <div className="text-sm text-gray-600">待完成</div>
        </div>
      </div>
      
      {total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>完成进度</span>
            <span>{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
