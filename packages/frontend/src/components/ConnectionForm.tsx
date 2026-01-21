import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { ConnectionConfig, ParameterType, CurveType } from '../types';

interface ConnectionFormProps {
  onSubmit: (config: ConnectionConfig) => Promise<void>;
  onCancel: () => void;
  initialPath?: string;
}

export function ConnectionForm({ onSubmit, onCancel, initialPath = '' }: ConnectionFormProps) {
  const [emberPath, setEmberPath] = useState(initialPath);
  const [oscAddress, setOscAddress] = useState('');
  const [parameterType, setParameterType] = useState<ParameterType>('INTEGER');
  const [curve, setCurve] = useState<CurveType>('lin');
  const [emberMin, setEmberMin] = useState('0');
  const [emberMax, setEmberMax] = useState('100');
  const [oscMin, setOscMin] = useState('0');
  const [oscMax, setOscMax] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        emberPath,
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
            <label className="block text-sm text-gray-400 mb-1">Ember+ Path</label>
            <input
              type="text"
              value={emberPath}
              onChange={(e) => setEmberPath(e.target.value)}
              placeholder="1.2.3.4"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              required
            />
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
