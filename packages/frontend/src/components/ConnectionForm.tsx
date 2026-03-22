import { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';
import type { Connection, ConnectionConfig, ParameterType, ScaleMode, TreeNode } from '../types';

interface ConnectionFormProps {
  onSubmit: (config: ConnectionConfig) => Promise<void>;
  onCancel: () => void;
  initialPath?: string;
  initialIdentifierPath?: string;
  selectedNode?: TreeNode | null;
  hierarchyPath?: string;
  editingConnection?: Connection | null;
}

const SCALE_MODE_LABELS: Record<ScaleMode, { label: string; hint: string }> = {
  'lin-lin': {
    label: 'Lin → Lin  (proportional remap)',
    hint: 'Default. Use for dB↔dB, integers↔floats, or any proportional ranges.',
  },
  'log-lin': {
    label: 'Log → Lin  (amplitude → dB / 0..1)',
    hint: 'Ember+ is a linear amplitude (≥ 0, e.g. 0..32767). OSC receives a perceptual/dB value.',
  },
  'lin-log': {
    label: 'Lin → Log  (dB / 0..1 → amplitude)',
    hint: 'Ember+ is in dB or 0..1. OSC expects a linear amplitude value.',
  },
  'log-log': {
    label: 'Log → Log  (amplitude → amplitude)',
    hint: 'Both sides are linear amplitudes. Same log curve, different ranges.',
  },
};

function getDefaultsFromNode(node?: TreeNode | null) {
  if (!node) return {};
  const paramType = (node.parameterType as ParameterType) || 'INTEGER';
  const oscAddr = node.description
    ? '/' + node.description.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_/]/g, '')
    : '/' + node.path.replace(/\./g, '/');
  let emberMin = node.minimum ?? 0;
  let emberMax = node.maximum ?? 100;
  let oscMin = 0;
  let oscMax = 1;
  if (paramType === 'BOOLEAN') { emberMin = 0; emberMax = 1; oscMin = 0; oscMax = 1; }
  else if (paramType === 'REAL') { oscMin = 0; oscMax = 1; }
  return { paramType, oscAddr, emberMin, emberMax, oscMin, oscMax };
}

export function ConnectionForm({
  onSubmit, onCancel, initialPath = '', initialIdentifierPath,
  selectedNode, hierarchyPath = '', editingConnection,
}: ConnectionFormProps) {
  const isEditing = !!editingConnection;
  const defaults = getDefaultsFromNode(selectedNode);

  const [emberPath, setEmberPath] = useState(editingConnection?.emberPath ?? initialPath);
  const [emberIdentifierPath, setEmberIdentifierPath] = useState(
    editingConnection?.emberIdentifierPath ?? initialIdentifierPath ?? ''
  );
  const hasIdentifierPath = emberIdentifierPath.trim().length > 0;
  const [oscAddress, setOscAddress] = useState(editingConnection?.oscAddress ?? defaults.oscAddr ?? '');
  const [parameterType, setParameterType] = useState<ParameterType>(
    editingConnection?.parameterType ?? defaults.paramType ?? 'INTEGER'
  );
  const [scaleMode, setScaleMode] = useState<ScaleMode>(editingConnection?.scaleMode ?? 'lin-lin');
  const [factor, setFactor] = useState(String(editingConnection?.factor ?? 1));
  const [emberMin, setEmberMin] = useState(String(editingConnection?.emberMin ?? defaults.emberMin ?? 0));
  const [emberMax, setEmberMax] = useState(String(editingConnection?.emberMax ?? defaults.emberMax ?? 100));
  const [oscMin, setOscMin] = useState(String(editingConnection?.oscMin ?? defaults.oscMin ?? 0));
  const [oscMax, setOscMax] = useState(String(editingConnection?.oscMax ?? defaults.oscMax ?? 1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingConnection) return;
    if (selectedNode) {
      const d = getDefaultsFromNode(selectedNode);
      setEmberPath(selectedNode.path);
      setEmberIdentifierPath(selectedNode.identifierPath || initialIdentifierPath || '');
      setOscAddress(hierarchyPath || d.oscAddr || '');
      setParameterType(d.paramType || 'INTEGER');
      setEmberMin(String(d.emberMin ?? 0));
      setEmberMax(String(d.emberMax ?? 100));
      setOscMin(String(d.oscMin ?? 0));
      setOscMax(String(d.oscMax ?? 1));
    }
  }, [selectedNode, hierarchyPath, initialIdentifierPath, editingConnection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        emberPath: hasIdentifierPath ? undefined : emberPath,
        emberIdentifierPath: emberIdentifierPath.trim() || undefined,
        oscAddress: oscAddress.startsWith('/') ? oscAddress : `/${oscAddress}`,
        parameterType,
        scaleMode,
        factor: Number(factor) || 1,
        emberMin: Number(emberMin),
        emberMax: Number(emberMax),
        oscMin: Number(oscMin),
        oscMax: Number(oscMax),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {isEditing ? 'Edit Connection' : 'New Connection'}
        </h3>
        <button onClick={onCancel} className="p-1 hover:bg-gray-700 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            {hasIdentifierPath ? (
              <>
                <label className="block text-sm text-gray-400 mb-1">
                  Ember+ Identifier <span className="text-green-400">🔒</span>
                </label>
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
                <p className="mt-1 text-xs text-gray-500">No stable identifier — path may change on reload.</p>
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
            <label className="block text-sm text-gray-400 mb-1">Parameter Type</label>
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
            <label className="block text-sm text-gray-400 mb-1">
              Scale Mode <span className="text-gray-500 text-xs">(Ember+ → OSC)</span>
            </label>
            <select
              value={scaleMode}
              onChange={(e) => setScaleMode(e.target.value as ScaleMode)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {(Object.keys(SCALE_MODE_LABELS) as ScaleMode[]).map((mode) => (
                <option key={mode} value={mode}>{SCALE_MODE_LABELS[mode].label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{SCALE_MODE_LABELS[scaleMode].hint}</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ember Min</label>
            <input type="number" value={emberMin} onChange={(e) => setEmberMin(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ember Max</label>
            <input type="number" value={emberMax} onChange={(e) => setEmberMax(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">OSC Min</label>
            <input type="number" step="0.01" value={oscMin} onChange={(e) => setOscMin(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">OSC Max</label>
            <input type="number" step="0.01" value={oscMax} onChange={(e) => setOscMax(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1" title="Ember+ integer factor: osc = ember / factor">
              Factor
            </label>
            <input type="number" step="1" min="1" value={factor} onChange={(e) => setFactor(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <p className="mt-1 text-xs text-gray-500">osc = ember / factor</p>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1 disabled:opacity-50">
            {isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Connection')}
          </button>
        </div>
      </form>
    </div>
  );
}
