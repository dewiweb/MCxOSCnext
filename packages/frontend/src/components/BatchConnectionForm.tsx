import { useState, useMemo } from 'react';
import { X, Plus, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { ConnectionConfig, ParameterType, ScaleMode } from '../types';

interface BatchConnectionFormProps {
  onSubmitBatch: (configs: ConnectionConfig[]) => Promise<void>;
  onCancel: () => void;
}

const SCALE_MODE_LABELS: Record<ScaleMode, string> = {
  'lin-lin': 'Linear → Linear',
  'log-lin': 'Logarithmic → Linear',
  'lin-log': 'Linear → Logarithmic',
  'log-log': 'Logarithmic → Logarithmic',
};

function resolvePlaceholder(template: string, i: number): string {
  return template
    .replace(/\{hex\(i\)\}/g, i.toString(16))
    .replace(/\{HEX\(i\)\}/g, i.toString(16).toUpperCase())
    .replace(/\{i\}/g, String(i));
}

function generatePreview(
  emberTemplate: string,
  oscTemplate: string,
  from: number,
  to: number,
  parameterType: ParameterType,
  scaleMode: ScaleMode,
  emberMin: number,
  emberMax: number,
  oscMin: number,
  oscMax: number,
): ConnectionConfig[] {
  if (from > to || isNaN(from) || isNaN(to)) return [];
  const configs: ConnectionConfig[] = [];
  for (let i = from; i <= to; i++) {
    const emberResolved = resolvePlaceholder(emberTemplate, i);
    const oscResolved = resolvePlaceholder(oscTemplate, i);
    if (!emberResolved || !oscResolved) continue;

    const isIdentifier = emberResolved.startsWith('_');
    configs.push({
      emberIdentifierPath: isIdentifier ? emberResolved : undefined,
      emberPath: isIdentifier ? undefined : emberResolved,
      oscAddress: oscResolved.startsWith('/') ? oscResolved : `/${oscResolved}`,
      parameterType,
      scaleMode,
      emberMin,
      emberMax,
      oscMin,
      oscMax,
      factor: 1,
    });
  }
  return configs;
}

export function BatchConnectionForm({ onSubmitBatch, onCancel }: BatchConnectionFormProps) {
  const [emberTemplate, setEmberTemplate] = useState('_2._7._{hex(i)}._400016b0._400016b1');
  const [oscTemplate, setOscTemplate] = useState('/track/{i}/gain');
  const [rangeFrom, setRangeFrom] = useState('1');
  const [rangeTo, setRangeTo] = useState('16');
  const [parameterType, setParameterType] = useState<ParameterType>('INTEGER');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('lin-lin');
  const [emberMin, setEmberMin] = useState('-4096');
  const [emberMax, setEmberMax] = useState('480');
  const [oscMin, setOscMin] = useState('-128');
  const [oscMax, setOscMax] = useState('15');
  const [showPreview, setShowPreview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => generatePreview(
    emberTemplate, oscTemplate,
    parseInt(rangeFrom, 10), parseInt(rangeTo, 10),
    parameterType, scaleMode,
    Number(emberMin), Number(emberMax),
    Number(oscMin), Number(oscMax),
  ), [emberTemplate, oscTemplate, rangeFrom, rangeTo, parameterType, scaleMode, emberMin, emberMax, oscMin, oscMax]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview.length === 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmitBatch(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Batch Connection Creator</h3>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-gray-700 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Templates */}
        <div className="bg-gray-750 border border-gray-700 rounded-lg p-3 space-y-3">
          <p className="text-xs text-gray-400">
            Use <code className="bg-gray-700 px-1 rounded text-blue-300">{'{i}'}</code> for decimal index,{' '}
            <code className="bg-gray-700 px-1 rounded text-blue-300">{'{hex(i)}'}</code> for hex index.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Ember+ Identifier Pattern{' '}
                <span className="text-xs text-gray-500">(starts with _ = identifier)</span>
              </label>
              <input
                type="text"
                value={emberTemplate}
                onChange={(e) => setEmberTemplate(e.target.value)}
                placeholder="_2._7._{hex(i)}._400016b0._400016b1"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">OSC Address Pattern</label>
              <input
                type="text"
                value={oscTemplate}
                onChange={(e) => setOscTemplate(e.target.value)}
                placeholder="/track/{i}/gain"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Range */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">From</label>
            <input
              type="number"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              min={1}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">To</label>
            <input
              type="number"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              min={1}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
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
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Scale Mode</label>
            <select
              value={scaleMode}
              onChange={(e) => setScaleMode(e.target.value as ScaleMode)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {(Object.keys(SCALE_MODE_LABELS) as ScaleMode[]).map((m) => (
                <option key={m} value={m}>{SCALE_MODE_LABELS[m]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ranges */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Ember Min', val: emberMin, set: setEmberMin },
            { label: 'Ember Max', val: emberMax, set: setEmberMax },
            { label: 'OSC Min',   val: oscMin,   set: setOscMin   },
            { label: 'OSC Max',   val: oscMax,   set: setOscMax   },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-sm text-gray-400 mb-1">{label}</label>
              <input
                type="number"
                step="0.01"
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-750 hover:bg-gray-700 text-sm"
          >
            <span className="font-medium">
              Preview{' '}
              <span className="text-blue-400 font-mono">{preview.length}</span> connection{preview.length !== 1 ? 's' : ''}
            </span>
            {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showPreview && (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="px-3 py-1 text-left font-medium">#</th>
                    <th className="px-3 py-1 text-left font-medium">Ember+ Identifier / Path</th>
                    <th className="px-3 py-1 text-left font-medium">OSC Address</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((c, idx) => (
                    <tr key={idx} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-3 py-1 text-gray-500">{parseInt(rangeFrom, 10) + idx}</td>
                      <td className="px-3 py-1 font-mono text-green-300">
                        {c.emberIdentifierPath || c.emberPath}
                      </td>
                      <td className="px-3 py-1 font-mono text-purple-300">{c.oscAddress}</td>
                    </tr>
                  ))}
                  {preview.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                        No connections — check your template and range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

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
            disabled={isSubmitting || preview.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting
              ? 'Creating...'
              : `Create ${preview.length} Connection${preview.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
