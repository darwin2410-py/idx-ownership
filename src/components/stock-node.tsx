'use client';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

type StockNodeData = { code: string; name: string; percentage: string };
type StockNodeType = Node<StockNodeData, 'stock'>;

export function StockNode({ data }: NodeProps<StockNodeType>) {
  return (
    <div className="w-24 h-24 rounded-full bg-amber-400 text-gray-900 flex flex-col items-center justify-center text-center cursor-pointer shadow-md hover:bg-amber-500 transition-colors">
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <span className="font-bold text-sm leading-tight">{data.code}</span>
      <span className="text-xs mt-0.5 opacity-75">{data.percentage}%</span>
      <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
    </div>
  );
}
