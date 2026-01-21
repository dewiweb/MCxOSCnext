import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useConnections } from './hooks/useConnections';
import { ConnectionTable } from './components/ConnectionTable';
import { ConnectionForm } from './components/ConnectionForm';
import { TreeViewer } from './components/TreeViewer';
import { SessionManager } from './components/SessionManager';
import { StatusBar } from './components/StatusBar';
import { ConfigPanel } from './components/ConfigPanel';
import { LogViewer } from './components/LogViewer';
import { useLogStore } from './stores/logStore';
import { Plus, X } from 'lucide-react';
import type { TreeNode, ConnectionConfig } from './types';

function App() {
  useWebSocket();
  const { createConnection, loadConnections } = useConnections();
  const logs = useLogStore((s) => s.logs);
  const clearLogs = useLogStore((s) => s.clear);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [activeTab, setActiveTab] = useState<'connections' | 'tree'>('connections');

  const handleSelectPath = (path: string, _node: TreeNode) => {
    setSelectedPath(path);
    setShowForm(true);
    setActiveTab('connections');
  };

  const handleCreateConnection = async (config: ConnectionConfig) => {
    await createConnection(config);
    setShowForm(false);
    setSelectedPath('');
    loadConnections();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">MCxOSC</h1>
            <p className="text-sm text-gray-400">Ember+ to OSC Bridge</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBar />
            <ConfigPanel />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-850 border-r border-gray-700 p-4 space-y-4 min-h-[calc(100vh-73px)]">
          <SessionManager />
          <TreeViewer onSelectPath={handleSelectPath} />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 space-y-4">
          {/* Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('connections')}
                className={`px-4 py-2 rounded-t text-sm ${
                  activeTab === 'connections'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                Connections
              </button>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 ${
                showForm
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Cancel' : 'New Connection'}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <ConnectionForm
              initialPath={selectedPath}
              onSubmit={handleCreateConnection}
              onCancel={() => {
                setShowForm(false);
                setSelectedPath('');
              }}
            />
          )}

          {/* Content */}
          {activeTab === 'connections' && <ConnectionTable />}

        </main>
      </div>

      {/* Fixed bottom log viewer */}
      <LogViewer logs={logs} onClear={clearLogs} />
    </div>
  );
}

export default App;
