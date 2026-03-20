import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface AppConfig {
  ember: {
    host: string;
    port: number;
    autoConnect: boolean;
  };
  osc: {
    rxPort: number;
    txHost: string;
    txPort: number;
  };
}

export function ConfigPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [emberHost, setEmberHost] = useState('');
  const [emberPort, setEmberPort] = useState('');
  const [oscRxPort, setOscRxPort] = useState('');
  const [oscTxHost, setOscTxHost] = useState('');
  const [oscTxPort, setOscTxPort] = useState('');

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getConfig();
      setConfig(data);
      setEmberHost(data.ember.host);
      setEmberPort(String(data.ember.port));
      setOscRxPort(String(data.osc.rxPort));
      setOscTxHost(data.osc.txHost);
      setOscTxPort(String(data.osc.txPort));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !config) {
      loadConfig();
    }
  }, [isOpen, config, loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.updateConfig({
        ember: {
          host: emberHost,
          port: parseInt(emberPort, 10),
          autoConnect: true,
        },
        osc: {
          rxPort: parseInt(oscRxPort, 10),
          txHost: oscTxHost,
          txPort: parseInt(oscTxPort, 10),
        },
      });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmberConnect = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.connectEmber(emberHost, parseInt(emberPort, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOscRestart = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.restartOsc(
        parseInt(oscRxPort, 10),
        oscTxHost,
        parseInt(oscTxPort, 10)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart OSC');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-gray-700 rounded"
        title="Configuration"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Configuration</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ember+ Configuration */}
            <div className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4 text-blue-400">Ember+ Device</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Host / IP</label>
                  <input
                    type="text"
                    value={emberHost}
                    onChange={(e) => setEmberHost(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Port</label>
                  <input
                    type="number"
                    value={emberPort}
                    onChange={(e) => setEmberPort(e.target.value)}
                    placeholder="9000"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleEmberConnect}
                disabled={isSaving}
                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                Connect
              </button>
            </div>

            {/* OSC Configuration */}
            <div className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4 text-purple-400">OSC Device</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">RX Port (incoming)</label>
                  <input
                    type="number"
                    value={oscRxPort}
                    onChange={(e) => setOscRxPort(e.target.value)}
                    placeholder="8000"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Port on which MCxOSC listens for OSC messages (UDP).
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">
                    ⚠️ In Docker: the internal port can be changed here, but the host port
                    mapped in your compose (<code className="bg-gray-700 px-1 rounded">OSC_RX_PORT:8000/udp</code>) must match.
                    If they differ, UDP packets won't reach the container.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">TX Host (outgoing)</label>
                    <input
                      type="text"
                      value={oscTxHost}
                      onChange={(e) => setOscTxHost(e.target.value)}
                      placeholder="192.168.1.200"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">TX Port</label>
                    <input
                      type="number"
                      value={oscTxPort}
                      onChange={(e) => setOscTxPort(e.target.value)}
                      placeholder="9000"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">IP and port of the OSC device receiving messages from MCxOSC</p>
              </div>
              <button
                onClick={handleOscRestart}
                disabled={isSaving}
                className="mt-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                Apply & Restart OSC
              </button>
            </div>

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
