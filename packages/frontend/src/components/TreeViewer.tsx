import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Grid, Zap, Plus, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { TreeNode } from '../types';

interface TreeViewerProps {
  onSelectPath: (path: string, node: TreeNode, hierarchyPath: string, identifierPath?: string) => void;
  onSelectMatrix?: (path: string, node: TreeNode) => void;
}

// Store node descriptions by path for building hierarchy
const nodeDescriptions = new Map<string, string>();

function buildHierarchyPath(path: string): string {
  const segments = path.split('.');
  const names: string[] = [];
  
  // Build cumulative path and get description for each segment
  for (let i = 0; i < segments.length; i++) {
    const partialPath = segments.slice(0, i + 1).join('.');
    const description = nodeDescriptions.get(partialPath);
    if (description) {
      // Convert to OSC-friendly format: lowercase, replace spaces with underscores
      names.push(description.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
    }
  }
  
  return '/' + names.join('/');
}

function storeNodeDescriptions(nodes: TreeNode[]): void {
  for (const node of nodes) {
    if (node.description || node.identifier) {
      nodeDescriptions.set(node.path, node.description || node.identifier || `node${node.number}`);
    }
  }
}

export function TreeViewer({ onSelectPath, onSelectMatrix }: TreeViewerProps) {
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadRoot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nodes = await api.getTree();
      storeNodeDescriptions(nodes);
      setRootNodes(nodes);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tree');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!isConnected && rootNodes.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ember+ Tree</h3>
        </div>
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadRoot}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              {isLoading ? 'Loading...' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Connect to Ember+ to browse the tree</p>
            <button
              onClick={loadRoot}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2 mx-auto"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
              Load Tree
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Ember+ Tree</h3>
        <button
          onClick={loadRoot}
          disabled={isLoading}
          className="p-1 hover:bg-gray-700 rounded"
          title="Refresh"
        >
          <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
        <div className="min-w-max">
          {rootNodes.map((node) => (
            <TreeNodeItem
              key={node.path || node.number}
              node={node}
              depth={0}
              onSelect={onSelectPath}
              onSelectMatrix={onSelectMatrix}
              onChildrenLoaded={storeNodeDescriptions}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TreeNodeItem({
  node,
  depth,
  onSelect,
  onSelectMatrix,
  onChildrenLoaded,
}: {
  node: TreeNode;
  depth: number;
  onSelect: (path: string, node: TreeNode, hierarchyPath: string, identifierPath?: string) => void;
  onSelectMatrix?: (path: string, node: TreeNode) => void;
  onChildrenLoaded: (nodes: TreeNode[]) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleExpand = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    if (children.length === 0 && node.hasChildren) {
      setIsLoading(true);
      try {
        const nodes = await api.expandNode(node.path, node.identifierPath);
        onChildrenLoaded(nodes);
        setChildren(nodes);
      } catch (err) {
        console.error('Failed to expand node:', err);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(true);
  };

  const handleSelect = () => {
    if (node.type === 'PARAMETER') {
      const hierarchyPath = buildHierarchyPath(node.path);
      onSelect(node.path, node, hierarchyPath, node.identifierPath);
    } else if (node.isMatrix && onSelectMatrix) {
      onSelectMatrix(node.path, node);
    }
  };

  const icon = getNodeIcon(node);
  const isSelectable = node.type === 'PARAMETER' || node.isMatrix;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded text-sm hover:bg-gray-700 ${
          isSelectable ? 'cursor-pointer' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.hasChildren ? (
          <button onClick={handleExpand} className="p-0.5 hover:bg-gray-600 rounded">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        <span className="text-gray-400">{icon}</span>
        
        <span
          className={`flex-1 truncate ${isSelectable ? 'text-blue-400' : 'text-gray-300'}`}
          onClick={handleSelect}
          title={node.identifierPath ? `Path: ${node.path}\nIdentifier: ${node.identifierPath}` : `Path: ${node.path}`}
        >
          {node.description ? (
            <>
              <span>{node.description}</span>
              <span className="text-gray-500 ml-1 text-xs">({node.number})</span>
            </>
          ) : (
            <span className="text-gray-400">[{node.number}]</span>
          )}
        </span>

        {node.value !== undefined && (
          <span className="text-gray-500 text-xs font-mono">
            {formatNodeValue(node.value)}
          </span>
        )}

        {isSelectable && (
          <button
            onClick={handleSelect}
            className="p-1 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100"
            title="Add connection"
          >
            <Plus className="w-3 h-3 text-green-400" />
          </button>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNodeItem
              key={child.path || child.number}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              onSelectMatrix={onSelectMatrix}
              onChildrenLoaded={onChildrenLoaded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getNodeIcon(node: TreeNode): React.ReactNode {
  if (node.isMatrix) return <Grid className="w-4 h-4" />;
  if (node.isFunction) return <Zap className="w-4 h-4" />;
  if (node.type === 'PARAMETER') return <FileText className="w-4 h-4" />;
  return <Folder className="w-4 h-4" />;
}

function formatNodeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'string' && value.length > 20) return value.slice(0, 20) + '...';
  return String(value);
}
