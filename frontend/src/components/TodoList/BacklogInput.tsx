import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface BacklogInputProps {
  onAdd: (title: string, description?: string) => void;
  disabled?: boolean;
}

export function BacklogInput({ onAdd, disabled }: BacklogInputProps) {
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="添加新的 Backlog..."
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowDescription(!showDescription)}
          disabled={disabled}
        >
          添加描述
        </Button>
        <Button type="submit" disabled={disabled || !title.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          添加
        </Button>
      </div>
      
      {showDescription && (
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Backlog 描述 (可选)"
          disabled={disabled}
          rows={2}
        />
      )}
    </form>
  );
}
