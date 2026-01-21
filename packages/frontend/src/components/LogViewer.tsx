import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}

type LogLevel = LogEntry['level'];

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogViewerProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogViewer({ logs, onClear }: LogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [minLevel, setMinLevel] = useState<LogLevel>('info');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(
    (log) => LOG_LEVEL_PRIORITY[log.level] >= LOG_LEVEL_PRIORITY[minLevel]
  );

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-300';
    }
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'bg-red-900 text-red-300';
      case 'warn': return 'bg-yellow-900 text-yellow-300';
      case 'info': return 'bg-blue-900 text-blue-300';
      case 'debug': return 'bg-gray-800 text-gray-400';
      default: return 'bg-gray-800 text-gray-300';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-40">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Logs</span>
            <span className="text-xs text-gray-500">({filteredLogs.length}/{logs.length})</span>
          </div>
          
          {/* Log level filter */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-gray-400">Level:</span>
            <select
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value as LogLevel)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-blue-500"
            >
              {LOG_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <>
              <label className="flex items-center gap-1 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => {
                    e.stopPropagation();
                    setAutoScroll(e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3 h-3"
                />
                Auto-scroll
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="p-1 hover:bg-gray-600 rounded"
                title="Clear logs"
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Log content */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="bg-black p-2 font-mono text-xs overflow-y-auto max-h-48"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No logs at this level</div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className="flex gap-2 py-0.5 hover:bg-gray-900">
                <span className="text-gray-500 shrink-0">
                  {formatTime(log.timestamp)}
                </span>
                <span className={`px-1 rounded text-xs uppercase shrink-0 ${getLevelBadge(log.level)}`}>
                  {log.level.slice(0, 3)}
                </span>
                {log.source && (
                  <span className="text-purple-400 shrink-0">[{log.source}]</span>
                )}
                <span className={getLevelColor(log.level)}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
