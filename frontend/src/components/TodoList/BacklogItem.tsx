import { useState } from 'react';
import { BacklogItem } from '@/types/todo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Trash2, Save, X, ArrowRight } from 'lucide-react';

interface BacklogItemProps {
  item: BacklogItem;
  onUpdate: (id: string, updates: Partial<BacklogItem>) => void;
  onDelete: (id: string) => void;
  onAddToTodo: (id: string) => void;
  disabled?: boolean;
}

export function BacklogItemComponent({ item, onUpdate, onDelete, onAddToTodo, disabled }: BacklogItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description || '');

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdate(item.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setIsEditing(false);
  };

  const handleAddToTodo = () => {
    onAddToTodo(item.id);
  };

  const handleDelete = () => {
    if (window.confirm('确定要删除这个 Backlog 项目吗？')) {
      onDelete(item.id);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start space-x-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddToTodo}
          disabled={disabled || isEditing}
          className="mt-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
          title="发送到待办列表"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-xs">发送到待办</span>
        </Button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Backlog 标题"
                disabled={disabled}
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Backlog 描述 (可选)"
                disabled={disabled}
                rows={2}
              />
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900">
                {item.title}
              </h4>
              {item.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {item.description}
                </p>
              )}
              <div className="mt-2 text-xs text-gray-400">
                创建于: {new Date(item.created_at).toLocaleString()}
                {item.updated_at !== item.created_at && (
                  <span className="ml-2">
                    更新于: {new Date(item.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

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
