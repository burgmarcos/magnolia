import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  ConnectionMode,
  type Node,
  type Edge,
  type Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FileText, Database, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import styles from './KnowledgeGraphView.module.css';

// === Custom Node Types ===

interface CustomNodeData extends Record<string, unknown> {
  label: string;
  type: 'document' | 'chunk';
  details: string;
}

type CustomNodeType = Node<CustomNodeData, 'custom'>;

function CustomNodeComponent({ data, selected }: { data: CustomNodeData, selected: boolean }) {
  return (
    <div className={`${styles.customNode} ${selected ? styles.customNodeActive : ''}`}>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      
      <div 
        className={styles.nodeIcon} 
        style={data.type === 'document' ? { backgroundColor: 'var(--schemes-primary-container)', color: 'var(--schemes-on-primary-container)' } : undefined}
      >
        {data.type === 'document' ? <FileText size={16} /> : <Database size={16} />}
      </div>
      
      <div className={styles.nodeContent}>
        <p className={styles.nodeTitle}>{data.label}</p>
        <p className={styles.nodeSubtitle}>{data.details}</p>
      </div>
      
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNodeComponent,
};

interface GraphData {
  nodes: { id: string, label: string, type_name: string, details: string }[];
  edges: { id: string, source: string, target: string, relationship: string }[];
}

export function KnowledgeGraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoke<GraphData>('get_graph_data');
      
      const flowNodes: CustomNodeType[] = data.nodes.map(n => ({
        id: n.id,
        type: 'custom',
        position: { x: Math.random() * 800, y: Math.random() * 600 }, // Simple random layout for now
        data: {
          label: n.label,
          type: n.type_name as 'document' | 'chunk',
          details: n.details
        }
      }));

      const flowEdges: Edge[] = data.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relationship,
        animated: true,
        style: { stroke: 'var(--schemes-primary, #6750A4)' }
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error("Failed to load graph:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);


   
  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeDoubleClick = useCallback(async (_: React.MouseEvent, node: Node) => {
    if (node.data.type === 'document') {
      try {
        const path = node.id; // Node ID is currently the file path in our graph engine
        const content = await invoke<string>('read_text_file', { path });
        const name = path.split(/[\\/]/).pop() || 'document.md';
        
        window.dispatchEvent(new CustomEvent('Magnolia-open-app', {
          detail: { type: 'editor', title: name, filename: name, content, path }
        }));
      } catch (err) {
        console.error("Failed to open file from graph:", err);
      }
    }
  }, []);

  if (isLoading && nodes.length === 0) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Generating Graph View...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Controls />
        <MiniMap zoomable pannable nodeColor={() => 'var(--schemes-primary-container, #EADDFF)'} style={{ backgroundColor: 'var(--schemes-surface, #FBF8FF)' }} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--schemes-outline-variant, #CAC4D0)" />
      </ReactFlow>
    </div>
  );
}
