import { useState, useCallback, useEffect } from 'react';
import { TodoItem, TodoCreateRequest, TodoUpdateRequest, BacklogItem } from '@/types/todo';
import { useSSE } from './useSSE';

interface UseTodosReturn {
  todos: TodoItem[];
  backlogItems: BacklogItem[];
  loading: boolean;
  error: string | null;
  addTodo: (title: string, description?: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  fetchTodos: () => Promise<void>;
  addBacklogItem: (title: string, description?: string) => Promise<void>;
  updateBacklogItem: (id: string, updates: Partial<BacklogItem>) => Promise<void>;
  deleteBacklogItem: (id: string) => Promise<void>;
  moveToTodo: (id: string) => Promise<void>;
  fetchBacklogs: () => Promise<void>;
}

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lastEvent } = useSSE();

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (lastEvent) {
      switch (lastEvent.event) {
        case 'component_switch':
          break;
        case 'terminal_command_executed':
          break;
        case 'todo_added':
          if (lastEvent.data.todo) {
            setTodos(prev => {
              const exists = prev.some(todo => todo.id === lastEvent.data.todo.id);
              if (!exists) {
                return [...prev, lastEvent.data.todo];
              }
              return prev;
            });
          }
          break;
          
        case 'todo_updated':
          if (lastEvent.data.todo) {
            setTodos(prev => prev.map(todo => 
              todo.id === lastEvent.data.todo.id ? lastEvent.data.todo : todo
            ));
          }
          break;
          
        case 'todo_deleted':
          if (lastEvent.data.todoId) {
            setTodos(prev => prev.filter(todo => todo.id !== lastEvent.data.todoId));
          }
          break;
          
        case 'todo_list':
          if (lastEvent.data.todos) {
            setTodos(lastEvent.data.todos);
          }
          break;
          
        case 'backlog_added':
          if (lastEvent.data.backlog) {
            setBacklogItems(prev => [lastEvent.data.backlog, ...prev]);
          }
          break;
          
        case 'backlog_updated':
          if (lastEvent.data.backlog) {
            setBacklogItems(prev => prev.map(item => 
              item.id === lastEvent.data.backlog.id ? lastEvent.data.backlog : item
            ));
          }
          break;
          
        case 'backlog_deleted':
          if (lastEvent.data.backlogId) {
            setBacklogItems(prev => prev.filter(item => item.id !== lastEvent.data.backlogId));
          }
          break;
          
        case 'backlog_sent_to_todo':
          if (lastEvent.data.backlog_id) {
            setBacklogItems(prev => prev.filter(item => item.id !== lastEvent.data.backlog_id));
          }
          break;
          
        case 'backlog_list':
          if (lastEvent.data.backlogs) {
            setBacklogItems(lastEvent.data.backlogs);
          }
          break;
          
        case 'error':
          setError(lastEvent.data.message || '发生未知错误');
          setLoading(false);
          break;
      }
    }
  }, [lastEvent]);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/todos`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取 Todo 列表失败';
      setError(errorMessage);
      console.error('Failed to fetch todos:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const addTodo = useCallback(async (title: string, description?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const todoData: TodoCreateRequest = { title, description };
      
      const response = await fetch(`${apiUrl}/api/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todoData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加 Todo 失败';
      setError(errorMessage);
      console.error('Failed to add todo:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const updateTodo = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    try {
      setLoading(true);
      setError(null);
      
      const updateData: TodoUpdateRequest = {
        title: updates.title,
        description: updates.description,
        completed: updates.completed,
      };
      
      const response = await fetch(`${apiUrl}/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新 Todo 失败';
      setError(errorMessage);
      console.error('Failed to update todo:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/todos/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除 Todo 失败';
      setError(errorMessage);
      console.error('Failed to delete todo:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const toggleTodo = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/todos/${id}/toggle`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '切换 Todo 状态失败';
      setError(errorMessage);
      console.error('Failed to toggle todo:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const addBacklogItem = useCallback(async (title: string, description?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/backlogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || ""
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add backlog item');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add backlog item');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const updateBacklogItem = useCallback(async (id: string, updates: Partial<BacklogItem>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/backlogs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update backlog item');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update backlog item');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const deleteBacklogItem = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/backlogs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete backlog item');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backlog item');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const moveToTodo = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/backlogs/${id}/send-to-todo`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to send backlog to todo');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send backlog to todo');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchBacklogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/backlogs`);
      if (!response.ok) {
        throw new Error('Failed to fetch backlogs');
      }
      const data = await response.json();
      setBacklogItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backlogs');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchTodos();
    fetchBacklogs();
  }, [fetchTodos, fetchBacklogs]);



  return {
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
    moveToTodo,
    fetchBacklogs,
  };
}
