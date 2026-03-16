'use client';
import { useState } from 'react';
import { Handle, Position, NodeProps, Node, NodeToolbar } from '@xyflow/react';

type StockNodeData = { code: string; name: string; percentage: string; size: number };
type StockNodeType = Node<StockNodeData, 'stock'>;

export function StockNode({ data }: NodeProps<StockNodeType>) {
  const [hovered, setHovered] = useState(false);
  const sz = data.size ?? 96;

  return (
    <>
      <NodeToolbar isVisible={hovered} position={Position.Top}>
        <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg max-w-[180px] text-center">
          <p className="font-medium leading-tight">{data.name}</p>
          <p className="opacity-80 mt-0.5">{data.percentage}%</p>
        </div>
      </NodeToolbar>
      <div
        style={{ width: sz, height: sz }}
        className="rounded-full bg-amber-400 text-gray-900 flex flex-col items-center justify-center text-center cursor-pointer shadow-md hover:bg-amber-500 transition-colors"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
        <span className="font-bold text-sm leading-tight">{data.code}</span>
        <span className="text-xs mt-0.5 opacity-75">{data.percentage}%</span>
        <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
      </div>
    </>
  );
}
