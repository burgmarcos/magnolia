import { useCallback } from 'react';
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
import { FileText, Database } from 'lucide-react';
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

// === Mock Data Setup ===

const initialNodes: CustomNodeType[] = [
  { id: 'doc-1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'architecture.md', type: 'document', details: 'Root Document' } },
  { id: 'chunk-1a', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Tauri Commands', type: 'chunk', details: 'Lines 12-40' } },
  { id: 'chunk-1b', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'React Routing', type: 'chunk', details: 'Lines 45-80' } },
  { id: 'doc-2', type: 'custom', position: { x: 600, y: 50 }, data: { label: 'meetings.md', type: 'document', details: 'Root Document' } },
  { id: 'chunk-2a', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Project Status', type: 'chunk', details: 'Lines 5-15' } },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'doc-1', target: 'chunk-1a', animated: true, style: { stroke: 'var(--schemes-primary, #6750A4)' } },
  { id: 'e2', source: 'doc-1', target: 'chunk-1b', animated: true, style: { stroke: 'var(--schemes-primary, #6750A4)' } },
  { id: 'e3', source: 'doc-2', target: 'chunk-2a', animated: true, style: { stroke: 'var(--schemes-primary, #6750A4)' } },
  // Cross connection meaning "similarity"
  { id: 'e4', source: 'chunk-1b', target: 'chunk-2a', animated: true, style: { stroke: '#EF4444', strokeDasharray: '5, 5' }, label: 'Semantic Match' },
];

export function KnowledgeGraphView() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
