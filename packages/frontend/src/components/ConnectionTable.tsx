import { memo } from 'react';
import type { Connection } from '../types';
import { useConnections } from '../hooks/useConnections';
import { Activity, Pause, Play, Trash2, AlertCircle, Pencil } from 'lucide-react';

export function ConnectionTable({ onEdit }: { onEdit?: (conn: Connection) => void }) {
  const { connections, isLoading, activateConnection, deactivateConnection, deleteConnection, activateAll } = useConnections();

  if (isLoading && connections.length === 0) {
    return <div className="text-gray-400 p-4">Loading connections...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Connections</h2>
        <button
          onClick={activateAll}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1"
        >
          <Play className="w-4 h-4" /> Activate All
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="text-gray-400 p-6 text-center">
          No connections configured. Add a connection to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Ember+ Ref</th>
                <th className="px-3 py-2 text-left">OSC Address</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Value</th>
                <th className="px-3 py-2 text-left">Direction</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((conn) => (
                <ConnectionRow
                  key={conn.id}
                  connection={conn}
                  onActivate={() => activateConnection(conn.id)}
                  onDeactivate={() => deactivateConnection(conn.id)}
                  onDelete={() => deleteConnection(conn.id)}
                  onEdit={onEdit ? () => onEdit(conn) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ConnectionRow = memo(function ConnectionRow({
  connection,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
}: {
  connection: Connection;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}) {
  const { isActive, error, direction, currentEmberValue, emberPath, emberIdentifierPath, oscAddress, parameterType, scaleMode } = connection;
  const displayRef = emberIdentifierPath || emberPath;
  const tooltip = emberIdentifierPath && emberPath ? `Numeric: ${emberPath}` : undefined;

  return (
    <tr className="border-t border-gray-700 hover:bg-gray-750">
      <td className="px-3 py-2">
        <StatusIndicator isActive={isActive} error={error} />
      </td>
      <td className="px-3 py-2 font-mono text-xs" title={tooltip}>
        {emberIdentifierPath && <span className="text-green-400 mr-1">🔒</span>}
        {displayRef}
      </td>
      <td className="px-3 py-2 font-mono text-xs">{oscAddress}</td>
      <td className="px-3 py-2">
        <TypeBadge type={parameterType} />
      </td>
      <td className="px-3 py-2 font-mono" title={`Scale: ${scaleMode ?? 'lin-lin'}`}>
        {formatValue(currentEmberValue)}
      </td>
      <td className="px-3 py-2">
        <DirectionIndicator direction={direction} />
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          {isActive ? (
            <button onClick={onDeactivate} className="p-1 hover:bg-gray-700 rounded" title="Deactivate">
              <Pause className="w-4 h-4 text-yellow-500" />
            </button>
          ) : (
            <button onClick={onActivate} className="p-1 hover:bg-gray-700 rounded" title="Activate">
              <Play className="w-4 h-4 text-green-500" />
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="p-1 hover:bg-gray-700 rounded" title="Edit">
              <Pencil className="w-4 h-4 text-blue-400" />
            </button>
          )}
          <button onClick={onDelete} className="p-1 hover:bg-gray-700 rounded" title="Delete">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );
});

function StatusIndicator({ isActive, error }: { isActive: boolean; error?: string }) {
  if (error) {
    return (
      <div className="flex items-center gap-1" title={error}>
        <AlertCircle className="w-4 h-4 text-red-500" />
      </div>
    );
  }
  return (
    <div
      className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}
      title={isActive ? 'Active' : 'Inactive'}
    />
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    INTEGER: 'bg-blue-600',
    REAL: 'bg-purple-600',
    BOOLEAN: 'bg-yellow-600',
    STRING: 'bg-green-600',
    ENUM: 'bg-orange-600',
  };
  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${colors[type] || 'bg-gray-600'}`}>
      {type}
    </span>
  );
}

function DirectionIndicator({ direction }: { direction: string }) {
  if (direction === 'ember-to-osc') {
    return (
      <span title="Ember+ → OSC">
        <Activity className="w-4 h-4 text-blue-400" />
      </span>
    );
  }
  if (direction === 'osc-to-ember') {
    return (
      <span title="OSC → Ember+">
        <Activity className="w-4 h-4 text-purple-400" />
      </span>
    );
  }
  return <span className="text-gray-500">—</span>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toFixed(2);
  return String(value);
}
