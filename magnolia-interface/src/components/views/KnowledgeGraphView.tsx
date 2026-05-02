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

// === Force-directed layout ===
function forceLayout(
  nodeIds: string[],
  edgePairs: { source: string; target: string }[],
  width = 800,
  height = 600,
  iterations = 50
): Map<string, { x: number; y: number }> {
  const n = nodeIds.length;
  const positions = new Map<string, { x: number; y: number }>();
  if (n === 0) return positions;

  const posX = new Float64Array(n);
  const posY = new Float64Array(n);
  const velX = new Float64Array(n);
  const velY = new Float64Array(n);

  const idToIndex = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const id = nodeIds[i];
    idToIndex.set(id, i);
    const angle = (2 * Math.PI * i) / n;
    posX[i] = width / 2 + (width / 3) * Math.cos(angle);
    posY[i] = height / 2 + (height / 3) * Math.sin(angle);
  }

  const edgesSource = new Int32Array(edgePairs.length);
  const edgesTarget = new Int32Array(edgePairs.length);
  let validEdgesCount = 0;

  for (let i = 0; i < edgePairs.length; i++) {
    const s = idToIndex.get(edgePairs[i].source);
    const t = idToIndex.get(edgePairs[i].target);
    if (s !== undefined && t !== undefined) {
      edgesSource[validEdgesCount] = s;
      edgesTarget[validEdgesCount] = t;
      validEdgesCount++;
    }
  }

  const repulsion = 4000;
  const attraction = 0.05;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      const pxA = posX[i];
      const pyA = posY[i];
      let vxA = velX[i];
      let vyA = velY[i];

      for (let j = i + 1; j < n; j++) {
        const dx = pxA - posX[j];
        const dy = pyA - posY[j];
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const force = repulsion / (distSq * dist);

        const fx = dx * force;
        const fy = dy * force;

        vxA += fx;
        vyA += fy;
        velX[j] -= fx;
        velY[j] -= fy;
      }
      velX[i] = vxA;
      velY[i] = vyA;
    }

    for (let e = 0; e < validEdgesCount; e++) {
      const s = edgesSource[e];
      const t = edgesTarget[e];
      const dx = posX[t] - posX[s];
      const dy = posY[t] - posY[s];
      const fx = dx * attraction;
      const fy = dy * attraction;
      velX[s] += fx;
      velY[s] += fy;
      velX[t] -= fx;
      velY[t] -= fy;
    }

    for (let i = 0; i < n; i++) {
      const vx = velX[i] * damping;
      const vy = velY[i] * damping;
      velX[i] = vx;
      velY[i] = vy;
      posX[i] = Math.max(50, Math.min(width - 50, posX[i] + vx));
      posY[i] = Math.max(50, Math.min(height - 50, posY[i] + vy));
    }
  }

  for (let i = 0; i < n; i++) {
    positions.set(nodeIds[i], { x: posX[i], y: posY[i] });
  }

  return positions;
}

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
      
      const positions = forceLayout(
        data.nodes.map(n => n.id),
        data.edges.map(e => ({ source: e.source, target: e.target }))
      );

      const flowNodes: CustomNodeType[] = data.nodes.map(n => ({
        id: n.id,
        type: 'custom',
        position: positions.get(n.id) ?? { x: 0, y: 0 },
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
