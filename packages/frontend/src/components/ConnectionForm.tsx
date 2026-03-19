import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { ConnectionConfig, ParameterType, CurveType, TreeNode } from '../types';

interface ConnectionFormProps {
  onSubmit: (config: ConnectionConfig) => Promise<void>;
  onCancel: () => void;
  initialPath?: string;
  initialIdentifierPath?: string;
  selectedNode?: TreeNode | null;
  hierarchyPath?: string;
}

function getDefaultsFromNode(node?: TreeNode | null) {
  if (!node) return {};
  
  const paramType = (node.parameterType as ParameterType) || 'INTEGER';
  
  // Default OSC address from node description or path
  const oscAddr = node.description 
    ? '/' + node.description.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_/]/g, '')
    : '/' + node.path.replace(/\./g, '/');
  
  // Default ranges based on parameter type
  let emberMin = node.minimum ?? 0;
  let emberMax = node.maximum ?? 100;
  let oscMin = 0;
  let oscMax = 1;
  
  if (paramType === 'BOOLEAN') {
    emberMin = 0;
    emberMax = 1;
    oscMin = 0;
    oscMax = 1;
  } else if (paramType === 'REAL') {
    oscMin = 0;
    oscMax = 1;
  }
  
  return { paramType, oscAddr, emberMin, emberMax, oscMin, oscMax };
}

export function ConnectionForm({ onSubmit, onCancel, initialPath = '', initialIdentifierPath, selectedNode, hierarchyPath = '' }: ConnectionFormProps) {
  const defaults = getDefaultsFromNode(selectedNode);
  
  const [emberPath, setEmberPath] = useState(initialPath);
  const [emberIdentifierPath, setEmberIdentifierPath] = useState(initialIdentifierPath || '');
  // If identifierPath is set, emberPath is the resolved numeric cache (read-only, set by backend)
  const hasIdentifierPath = emberIdentifierPath.trim().length > 0;
  const [oscAddress, setOscAddress] = useState(defaults.oscAddr || '');
  const [parameterType, setParameterType] = useState<ParameterType>(defaults.paramType || 'INTEGER');
  const [curve, setCurve] = useState<CurveType>('lin');
  const [emberMin, setEmberMin] = useState(String(defaults.emberMin ?? 0));
  const [emberMax, setEmberMax] = useState(String(defaults.emberMax ?? 100));
  const [oscMin, setOscMin] = useState(String(defaults.oscMin ?? 0));
  const [oscMax, setOscMax] = useState(String(defaults.oscMax ?? 1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      const d = getDefaultsFromNode(selectedNode);
      setEmberPath(selectedNode.path);
      setEmberIdentifierPath(selectedNode.identifierPath || initialIdentifierPath || '');
      // Use hierarchyPath if available, otherwise fall back to simple oscAddr
      setOscAddress(hierarchyPath || d.oscAddr || '');
      setParameterType(d.paramType || 'INTEGER');
      setEmberMin(String(d.emberMin ?? 0));
      setEmberMax(String(d.emberMax ?? 100));
      setOscMin(String(d.oscMin ?? 0));
      setOscMax(String(d.oscMax ?? 1));
    }
  }, [selectedNode, hierarchyPath, initialIdentifierPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        // If identifierPath is set, don't send emberPath (backend resolves it)
        emberPath: hasIdentifierPath ? undefined : emberPath,
        emberIdentifierPath: emberIdentifierPath.trim() || undefined,
        oscAddress: oscAddress.startsWith('/') ? oscAddress : `/${oscAddress}`,
        parameterType,
        curve,
        emberMin: Number(emberMin),
        emberMax: Number(emberMax),
        oscMin: Number(oscMin),
        oscMax: Number(oscMax),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">New Connection</h3>
        <button onClick={onCancel} className="p-1 hover:bg-gray-700 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            {hasIdentifierPath ? (
              <>
                <label className="block text-sm text-gray-400 mb-1">Ember+ Identifier <span className="text-green-400">🔒</span></label>
                <input
                  type="text"
                  value={emberIdentifierPath}
                  onChange={(e) => setEmberIdentifierPath(e.target.value)}
                  placeholder="_2._1._3._682._683"
                  className="w-full bg-gray-700 border border-green-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-400 font-mono"
                />
                {emberPath && (
                  <p className="mt-1 text-xs text-gray-500 font-mono" title="Numeric path resolved at activation">
                    ↳ {emberPath}
                  </p>
                )}
              </>
            ) : (
              <>
                <label className="block text-sm text-gray-400 mb-1">Ember+ Path</label>
                <input
                  type="text"
                  value={emberPath}
                  onChange={(e) => setEmberPath(e.target.value)}
                  placeholder="1.2.3.4"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">No stable identifier — path may change on production reload.</p>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">OSC Address</label>
            <input
              type="text"
              value={oscAddress}
              onChange={(e) => setOscAddress(e.target.value)}
              placeholder="/fader/1/volume"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={parameterType}
              onChange={(e) => setParameterType(e.target.value as ParameterType)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="INTEGER">Integer</option>
              <option value="REAL">Real</option>
              <option value="BOOLEAN">Boolean</option>
              <option value="STRING">String</option>
              <option value="ENUM">Enum</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Curve</label>
            <select
              value={curve}
              onChange={(e) => setCurve(e.target.value as CurveType)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="lin">Linear</option>
              <option value="log">Logarithmic</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ember Min</label>
            <input
              type="number"
              value={emberMin}
              onChange={(e) => setEmberMin(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ember Max</label>
            <input
              type="number"
              value={emberMax}
              onChange={(e) => setEmberMax(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">OSC Min</label>
            <input
              type="number"
              step="0.01"
              value={oscMin}
              onChange={(e) => setOscMin(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">OSC Max</label>
            <input
              type="number"
              step="0.01"
              value={oscMax}
              onChange={(e) => setOscMax(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? 'Creating...' : 'Create Connection'}
          </button>
        </div>
      </form>
    </div>
  );
}
