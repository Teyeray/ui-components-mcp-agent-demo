import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface TodoInputProps {
  onAdd: (title: string, description?: string) => void;
  disabled?: boolean;
}

export function TodoInput({ onAdd, disabled }: TodoInputProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim(), description.trim() || undefined);
      setTitle('');
      setDescription('');
      setShowDescription(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="添加新的 Todo..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowDescription(!showDescription)}
          disabled={disabled}
        >
          {showDescription ? '隐藏描述' : '添加描述'}
        </Button>
        <Button type="submit" disabled={disabled || !title.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          添加
        </Button>
      </div>

      {showDescription && (
        <Textarea
          placeholder="添加描述 (可选)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled}
          rows={3}
        />
      )}
    </form>
  );
}
