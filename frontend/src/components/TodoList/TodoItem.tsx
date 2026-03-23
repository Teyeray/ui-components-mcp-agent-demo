import { useState } from 'react';
import { TodoItem } from '@/types/todo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Trash2, Save, X, Brain } from 'lucide-react';

interface TodoItemProps {
  todo: TodoItem;
  onUpdate: (id: string, updates: Partial<TodoItem>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onSummarize?: (todo: TodoItem) => void;
  disabled?: boolean;
}

export function TodoItemComponent({ todo, onUpdate, onDelete, onToggle, onSummarize, disabled }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdate(todo.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setIsEditing(false);
  };

  const handleToggle = () => {
    onToggle(todo.id);
  };

  const handleDelete = () => {
    if (window.confirm('确定要删除这个 Todo 吗？')) {
      onDelete(todo.id);
    }
  };

  const handleSummarize = () => {
    if (onSummarize) {
      onSummarize(todo);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${todo.completed ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-start space-x-3">
        {/* 复选框 */}
        <Checkbox
          checked={todo.completed}
          onCheckedChange={handleToggle}
          disabled={disabled || isEditing}
          className="mt-1"
        />

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Todo 标题"
                disabled={disabled}
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Todo 描述 (可选)"
                disabled={disabled}
                rows={2}
              />
            </div>
          ) : (
            <div>
              <h4 className={`font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {todo.title}
              </h4>
              {todo.description && (
                <p className={`mt-1 text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                  {todo.description}
                </p>
              )}
              <div className="mt-2 text-xs text-gray-400">
                创建于: {new Date(todo.created_at).toLocaleString()}
                {todo.updated_at !== todo.created_at && (
                  <span className="ml-2">
                    更新于: {new Date(todo.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-1">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={disabled || !editTitle.trim()}
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSummarize}
                disabled={disabled}
                title="总结这个任务"
              >
                <Brain className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={disabled}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={disabled}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
