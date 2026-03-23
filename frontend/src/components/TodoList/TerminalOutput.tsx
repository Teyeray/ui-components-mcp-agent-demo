import { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TerminalCommand {
  id: string;
  action: string;
  command: string;
  output: string;
  file?: string;
  timestamp: number;
}

interface TerminalOutputProps {
  commands: TerminalCommand[];
  disabled?: boolean;
}

export function TerminalOutput({ commands, disabled }: TerminalOutputProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (commands.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Terminal className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p>暂无终端命令执行记录</p>
        <p className="text-sm mt-1">使用 MCP 工具执行 Linux 命令开始吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {commands.map((cmd) => (
        <div key={cmd.id} className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-green-400" />
              <span className="text-green-400">$</span>
              <span className="text-white">{cmd.command}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-xs">
                {formatTimestamp(cmd.timestamp)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(cmd.output, cmd.id)}
                disabled={disabled}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                {copiedId === cmd.id ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="bg-black rounded p-3 overflow-x-auto">
            <pre className="text-gray-300 whitespace-pre-wrap text-xs leading-relaxed">
              {cmd.output}
            </pre>
          </div>
          
          {cmd.file && (
            <div className="mt-2 text-xs text-gray-400">
              文件: <span className="text-blue-400">{cmd.file}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
