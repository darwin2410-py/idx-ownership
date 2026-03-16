'use client';

import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';
import * as d3Force from 'd3-force';
import { HolderNode } from './holder-node';
import { StockNode } from './stock-node';
import type { GraphData } from '@/lib/repositories/graph-repository';

const nodeTypes = {
  holder: HolderNode,
  stock: StockNode,
};

type SimNode = { id: string; x?: number; y?: number };
type SimLink = { source: string; target: string };

function buildGraph(data: GraphData): { nodes: Node[]; edges: Edge[] } {
  const CENTER_ID = '__center__';

  const simNodes: SimNode[] = [
    { id: CENTER_ID },
    ...data.stocks.map((s) => ({ id: s.emitenId })),
  ];

  const simLinks: SimLink[] = data.stocks.map((s) => ({
    source: CENTER_ID,
    target: s.emitenId,
  }));

  // Synchronous d3-force layout — stop immediately, tick to convergence
  const simulation = d3Force
    .forceSimulation<SimNode>(simNodes)
    .force('charge', d3Force.forceManyBody<SimNode>().strength(-400))
    .force(
      'link',
      d3Force
        .forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(180)
    )
    .force('center', d3Force.forceCenter(0, 0))
    .stop();

  for (let i = 0; i < 120; i++) simulation.tick();

  // Build position map
  const posMap = new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));

  const nodes: Node[] = [
    {
      id: CENTER_ID,
      type: 'holder',
      position: posMap.get(CENTER_ID)!,
      data: { name: data.centerLabel },
      draggable: true,
    },
    ...data.stocks.map((s) => ({
      id: s.emitenId,
      type: 'stock' as const,
      position: posMap.get(s.emitenId)!,
      data: { code: s.emitenId, name: s.emitenName, percentage: s.totalPercentage },
      draggable: true,
    })),
  ];

  const edges: Edge[] = data.stocks.map((s) => ({
    id: `${CENTER_ID}-${s.emitenId}`,
    source: CENTER_ID,
    target: s.emitenId,
  }));

  return { nodes, edges };
}

interface GraphCanvasProps {
  data: GraphData;
}

export function GraphCanvas({ data }: GraphCanvasProps) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => buildGraph(data), [data]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'stock') {
        router.push(`/stocks/${node.data.code as string}`);
      } else if (node.type === 'holder') {
        // Center node click does nothing (already on this graph)
        // This fires if user somehow clicks the center node — no-op is fine
      }
    },
    [router]
  );

  if (data.stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Tidak ada data kepemilikan pada periode terkini.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
