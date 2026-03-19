import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { ChannelStrip } from './ChannelStrip';

interface ChannelInfo {
  path: string;
  name: string;
  number: number;
}

interface MixerViewProps {
  isOpen: boolean;
  onClose: () => void;
  initialChannels?: string[];
}

export function MixerView({ isOpen, onClose, initialChannels = [] }: MixerViewProps) {
  const [channels, setChannels] = useState<string[]>(initialChannels);
  const [availableChannels, setAvailableChannels] = useState<ChannelInfo[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('');

  useEffect(() => {
    if (isOpen && availableChannels.length === 0) {
      loadAvailableChannels();
    }
  }, [isOpen]);

  const loadAvailableChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/v1/channel');
      const data = await res.json();
      if (data.success) {
        setAvailableChannels(data.data);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const addChannel = (path: string) => {
    if (path && !channels.includes(path)) {
      setChannels([...channels, path]);
    }
    setSelectedChannel('');
  };

  const removeChannel = (path: string) => {
    setChannels(channels.filter(c => c !== path));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-[95vw] max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">🎚️</span> Mixer View
          </h2>
          <div className="flex items-center gap-4">
            {/* Channel dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white w-64 focus:outline-none focus:border-cyan-500"
                disabled={loadingChannels}
              >
                <option value="">
                  {loadingChannels ? 'Loading channels...' : '-- Select a channel --'}
                </option>
                {availableChannels.map((ch) => (
                  <option key={ch.path} value={ch.path} disabled={channels.includes(ch.path)}>
                    {ch.name} {channels.includes(ch.path) ? '(added)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => addChannel(selectedChannel)}
                disabled={!selectedChannel}
                className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add channel"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Channel strips container */}
        <div className="flex-1 overflow-x-auto p-4">
          {channels.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No channels added</p>
                <p className="text-sm">Enter a channel path above or click on a channel in the tree view</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 min-h-[500px]">
              {channels.map((channelPath) => (
                <ChannelStrip
                  key={channelPath}
                  channelPath={channelPath}
                  onClose={() => removeChannel(channelPath)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {availableChannels.length > 0 
              ? `${availableChannels.length} channels available` 
              : 'Loading channels...'}
          </span>
          <span className="text-xs text-gray-500">
            {channels.length} channel{channels.length !== 1 ? 's' : ''} in view
          </span>
        </div>
      </div>
    </div>
  );
}

export default MixerView;
