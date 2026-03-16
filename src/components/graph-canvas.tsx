'use client';

import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
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

function buildGraph(data: GraphData): { nodes: Node[]; edges: Edge[] } {
  const CENTER_ID = '__center__';

  const simNodes: SimNode[] = [
    { id: CENTER_ID },
    ...data.stocks.map((s) => ({ id: s.emitenId })),
  ];

  // Synchronous d3-force layout — evenly space stock nodes on a circle (forceRadial)
  // Increased multiplier to 36 (was 28) — gives variable-size nodes (72–120px) more room
  const radius = Math.max(200, data.stocks.length * 36);

  const simulation = d3Force
    .forceSimulation<SimNode>(simNodes)
    .force(
      'radial',
      d3Force.forceRadial<SimNode>(radius, 0, 0)
        .strength((d) => (d.id === CENTER_ID ? 0 : 1))
    )
    .force('charge', d3Force.forceManyBody<SimNode>().strength(-80))
    .force('center', d3Force.forceCenter(0, 0))
    .stop();

  for (let i = 0; i < 300; i++) simulation.tick();

  // Build position map
  const posMap = new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));

  // Compute max percentage for relative scaling (guard against division by zero)
  const maxPct = Math.max(...data.stocks.map((s) => parseFloat(s.totalPercentage)), 1);

  const nodes: Node[] = [
    {
      id: CENTER_ID,
      type: 'holder',
      position: posMap.get(CENTER_ID)!,
      data: { name: data.centerLabel },
      draggable: true,
    },
    ...data.stocks.map((s) => {
      const pct = parseFloat(s.totalPercentage);
      const size = Math.round(72 + (pct / maxPct) * 48); // range: [72, 120]
      return {
        id: s.emitenId,
        type: 'stock' as const,
        position: posMap.get(s.emitenId)!,
        data: { code: s.emitenId, name: s.emitenName, percentage: s.totalPercentage, size },
        draggable: true,
      };
    }),
  ];

  const edges: Edge[] = data.stocks.map((s) => {
    const pct = parseFloat(s.totalPercentage);
    const strokeWidth = 1 + (pct / maxPct) * 7; // range: [1, 8]
    return {
      id: `${CENTER_ID}-${s.emitenId}`,
      source: CENTER_ID,
      target: s.emitenId,
      style: { strokeWidth },
    };
  });

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
        <MiniMap
          nodeColor={(node: { type?: string }) =>
            node.type === 'holder' ? '#14b8a6' : '#fbbf24'
          }
          nodeBorderRadius={50}
          pannable
        />
      </ReactFlow>
    </div>
  );
}
