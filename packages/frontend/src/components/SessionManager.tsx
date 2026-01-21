import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, FolderOpen, Plus, Trash2, Loader2, Download, Upload } from 'lucide-react';
import { api } from '../services/api';
import type { Session } from '../types';

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleLoadSession = async (name: string) => {
    setLoadingSession(name);
    try {
      await api.loadSession(name);
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoadingSession(null);
    }
  };

  const handleSaveSession = async (name: string) => {
    try {
      await api.saveSession(name);
      loadSessions();
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    try {
      await api.createSession(newSessionName.trim());
      setNewSessionName('');
      setShowNewForm(false);
      loadSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (name: string) => {
    if (!confirm(`Delete session "${name}"?`)) return;
    try {
      await api.deleteSession(name);
      loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    window.open('/api/v1/sessions/export/current', '_blank');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importSession(data);
      loadSessions();
    } catch (err) {
      console.error('Failed to import session:', err);
      alert('Failed to import session file');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sessions</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleImportClick}
            className="p-1 hover:bg-gray-700 rounded"
            title="Import session file"
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-1 hover:bg-gray-700 rounded"
            title="Export current session"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="p-1 hover:bg-gray-700 rounded"
            title="New session"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mcxosc,.session,.json"
        onChange={handleImportFile}
        className="hidden"
      />

      {showNewForm && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="Session name"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
          />
          <button
            onClick={handleCreateSession}
            disabled={!newSessionName.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No sessions saved</p>
      ) : (
        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.name}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 group"
            >
              <span className="flex-1 text-sm truncate">{session.name}</span>
              <button
                onClick={() => handleLoadSession(session.name)}
                disabled={loadingSession === session.name}
                className="p-1 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100"
                title="Load"
              >
                {loadingSession === session.name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                )}
              </button>
              <button
                onClick={() => handleSaveSession(session.name)}
                className="p-1 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100"
                title="Overwrite"
              >
                <Save className="w-4 h-4 text-green-400" />
              </button>
              <button
                onClick={() => handleDeleteSession(session.name)}
                className="p-1 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
