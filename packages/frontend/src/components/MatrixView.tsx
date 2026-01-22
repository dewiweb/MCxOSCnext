import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import type { MatrixInfo, MatrixConnectionsPage } from '../types';

interface MatrixViewProps {
  path: string;
  onClose?: () => void;
}

const VIEWPORT_SIZE = 25;

export function MatrixView({ path, onClose }: MatrixViewProps) {
  const [matrix, setMatrix] = useState<MatrixInfo | null>(null);
  const [connections, setConnections] = useState<Map<number, number[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  
  const [targetOffset, setTargetOffset] = useState(0);
  const [sourceOffset, setSourceOffset] = useState(0);

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/v1/matrix/${path}?targetOffset=0&targetLimit=200`);
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error?.message || 'Failed to load matrix');
      
      const page: MatrixConnectionsPage = data.data;
      setMatrix(page.matrix);
      
      const connMap = new Map<number, number[]>();
      for (const conn of page.connections) {
        connMap.set(conn.target, conn.sources);
      }
      setConnections(connMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  const handleCellClick = useCallback(async (target: number, source: number) => {
    if (!matrix || updating) return;
    
    const cellKey = `${target}-${source}`;
    setUpdating(cellKey);
    
    try {
      const currentSources = connections.get(target) || [];
      const isConnected = currentSources.includes(source);
      const newSources = isConnected 
        ? currentSources.filter(s => s !== source)
        : [...currentSources, source];
      
      const res = await fetch(`/api/v1/matrix/${path}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, sources: newSources }),
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to update');
      
      setConnections(prev => new Map(prev).set(target, newSources));
    } catch (err) {
      console.error('Matrix update error:', err);
    } finally {
      setUpdating(null);
    }
  }, [matrix, connections, path, updating]);

  const visibleTargets = useMemo(() => {
    if (!matrix) return [];
    const end = Math.min(targetOffset + VIEWPORT_SIZE, matrix.targetCount);
    return Array.from({ length: end - targetOffset }, (_, i) => targetOffset + i);
  }, [matrix, targetOffset]);

  const visibleSources = useMemo(() => {
    if (!matrix) return [];
    const end = Math.min(sourceOffset + VIEWPORT_SIZE, matrix.sourceCount);
    return Array.from({ length: end - sourceOffset }, (_, i) => sourceOffset + i);
  }, [matrix, sourceOffset]);

  const canScrollLeft = targetOffset > 0;
  const canScrollRight = matrix ? targetOffset + VIEWPORT_SIZE < matrix.targetCount : false;
  const canScrollUp = sourceOffset > 0;
  const canScrollDown = matrix ? sourceOffset + VIEWPORT_SIZE < matrix.sourceCount : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !matrix) {
    return (
      <div className="p-6">
        <div className="text-red-400 mb-4">{error || 'Matrix not found'}</div>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-[400px]">
      {/* Info */}
      <div className="text-sm text-gray-400 mb-2">
        {matrix.targetCount} targets × {matrix.sourceCount} sources
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between py-2 mb-2 bg-gray-700 rounded px-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTargetOffset(Math.max(0, targetOffset - VIEWPORT_SIZE))}
              disabled={!canScrollLeft}
              className="p-1 rounded hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-400">
              Targets {targetOffset + 1}-{Math.min(targetOffset + VIEWPORT_SIZE, matrix.targetCount)}
            </span>
            <button 
              onClick={() => setTargetOffset(Math.min(matrix.targetCount - VIEWPORT_SIZE, targetOffset + VIEWPORT_SIZE))}
              disabled={!canScrollRight}
              className="p-1 rounded hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSourceOffset(Math.max(0, sourceOffset - VIEWPORT_SIZE))}
              disabled={!canScrollUp}
              className="p-1 rounded hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-400">
              Sources {sourceOffset + 1}-{Math.min(sourceOffset + VIEWPORT_SIZE, matrix.sourceCount)}
            </span>
            <button 
              onClick={() => setSourceOffset(Math.min(matrix.sourceCount - VIEWPORT_SIZE, sourceOffset + VIEWPORT_SIZE))}
              disabled={!canScrollDown}
              className="p-1 rounded hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* Matrix Grid */}
      <div className="overflow-auto max-h-[60vh]">
        <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-gray-800 p-1 min-w-[40px]">S\T</th>
                {visibleTargets.map(t => (
                  <th key={t} className="sticky top-0 z-10 bg-gray-700 p-1 min-w-[28px] text-center">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSources.map(s => (
                <tr key={s}>
                  <th className="sticky left-0 z-10 bg-gray-700 p-1 text-center">{s}</th>
                  {visibleTargets.map(t => {
                    const sources = connections.get(t) || [];
                    const isConnected = sources.includes(s);
                    const cellKey = `${t}-${s}`;
                    const isUpdating = updating === cellKey;
                    
                    return (
                      <td 
                        key={cellKey}
                        onClick={() => handleCellClick(t, s)}
                        className={`
                          p-1 text-center cursor-pointer border border-gray-600
                          min-w-[28px] min-h-[28px]
                          ${isConnected ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-800 hover:bg-gray-700'}
                          ${isUpdating ? 'opacity-50' : ''}
                        `}
                      >
                        {isUpdating ? '...' : isConnected ? '×' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
