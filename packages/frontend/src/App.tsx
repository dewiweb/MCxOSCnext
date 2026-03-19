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
import { ResizablePanel } from './components/ResizablePanel';
import { MatrixView } from './components/MatrixView';
import { MixerView } from './components/MixerView';
import { useLogStore } from './stores/logStore';
import { Plus, X, Grid, Sliders } from 'lucide-react';
import type { TreeNode, ConnectionConfig } from './types';

function App() {
  useWebSocket();
  const { createConnection, loadConnections } = useConnections();
  const logs = useLogStore((s) => s.logs);
  const clearLogs = useLogStore((s) => s.clear);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [hierarchyPath, setHierarchyPath] = useState('');
  const [selectedIdentifierPath, setSelectedIdentifierPath] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'connections' | 'tree'>('connections');
  const [matrixPath, setMatrixPath] = useState<string | null>(null);
  const [matrixNode, setMatrixNode] = useState<TreeNode | null>(null);
  const [showMixer, setShowMixer] = useState(false);

  const handleSelectPath = (path: string, node: TreeNode, hierarchy: string, identifierPath?: string) => {
    setSelectedPath(path);
    setSelectedNode(node);
    setHierarchyPath(hierarchy);
    setSelectedIdentifierPath(identifierPath);
    setShowForm(true);
    setActiveTab('connections');
    setMatrixPath(null);
  };

  const handleSelectMatrix = (path: string, node: TreeNode) => {
    setMatrixPath(path);
    setMatrixNode(node);
    setShowForm(false);
  };

  const handleCreateConnection = async (config: ConnectionConfig) => {
    await createConnection(config);
    setShowForm(false);
    setSelectedPath('');
    setSelectedNode(null);
    setHierarchyPath('');
    setSelectedIdentifierPath(undefined);
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
            <button
              onClick={() => setShowMixer(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-sm"
            >
              <Sliders className="w-4 h-4" />
              Mixer
            </button>
            <StatusBar />
            <ConfigPanel />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Resizable Sidebar */}
        <ResizablePanel defaultWidth={320} minWidth={200} maxWidth={800}>
          <SessionManager />
          <TreeViewer onSelectPath={handleSelectPath} onSelectMatrix={handleSelectMatrix} />
        </ResizablePanel>

        {/* Main content */}
        <main className="flex-1 p-6 space-y-4 overflow-auto">
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
              selectedNode={selectedNode}
              hierarchyPath={hierarchyPath}
              initialIdentifierPath={selectedIdentifierPath}
              onSubmit={handleCreateConnection}
              onCancel={() => {
                setShowForm(false);
                setSelectedPath('');
                setSelectedNode(null);
                setHierarchyPath('');
                setSelectedIdentifierPath(undefined);
              }}
            />
          )}

          {/* Content */}
          {activeTab === 'connections' && <ConnectionTable />}

          {/* Matrix View Modal */}
          {matrixPath && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Grid className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">
                      Matrix: {matrixNode?.description || matrixPath}
                    </h2>
                  </div>
                  <button
                    onClick={() => setMatrixPath(null)}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-auto flex-1 p-4">
                  <MatrixView path={matrixPath} />
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Mixer View Modal */}
      <MixerView
        isOpen={showMixer}
        onClose={() => setShowMixer(false)}
        initialChannels={[]}
      />

      {/* Fixed bottom log viewer */}
      <LogViewer logs={logs} onClear={clearLogs} />
    </div>
  );
}

export default App;
