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
  const positions = new Map<string, { x: number; y: number }>();
  const n = nodeIds.length;
  if (n === 0) return positions;

  // Initialize on a circle
  nodeIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n;
    positions.set(id, {
      x: width / 2 + (width / 3) * Math.cos(angle),
      y: height / 2 + (height / 3) * Math.sin(angle),
    });
  });

  const repulsion = 4000;
  const attraction = 0.05;
  const damping = 0.85;
  const velocities = new Map(nodeIds.map(id => [id, { vx: 0, vy: 0 }]));

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = positions.get(nodeIds[i])!;
        const b = positions.get(nodeIds[j])!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const vA = velocities.get(nodeIds[i])!;
        const vB = velocities.get(nodeIds[j])!;
        vA.vx += (dx / dist) * force;
        vA.vy += (dy / dist) * force;
        vB.vx -= (dx / dist) * force;
        vB.vy -= (dy / dist) * force;
      }
    }
    // Attraction along edges
    for (const { source, target } of edgePairs) {
      const a = positions.get(source);
      const b = positions.get(target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const vA = velocities.get(source)!;
      const vB = velocities.get(target)!;
      vA.vx += dx * attraction;
      vA.vy += dy * attraction;
      vB.vx -= dx * attraction;
      vB.vy -= dy * attraction;
    }
    // Apply velocities with damping
    for (const id of nodeIds) {
      const p = positions.get(id)!;
      const v = velocities.get(id)!;
      v.vx *= damping;
      v.vy *= damping;
      p.x = Math.max(50, Math.min(width - 50, p.x + v.vx));
      p.y = Math.max(50, Math.min(height - 50, p.y + v.vy));
    }
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
