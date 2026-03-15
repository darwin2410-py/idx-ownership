'use client';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

type HolderNodeData = { name: string };
type HolderNodeType = Node<HolderNodeData, 'holder'>;

export function HolderNode({ data }: NodeProps<HolderNodeType>) {
  return (
    <div className="w-24 h-24 rounded-full bg-teal-500 text-white flex items-center justify-center text-center text-xs font-medium p-2 cursor-pointer shadow-md hover:bg-teal-600 transition-colors">
      <Handle type="source" position={Position.Right} className="opacity-0 pointer-events-none" />
      <span className="line-clamp-3 leading-tight">{data.name}</span>
      <Handle type="target" position={Position.Left} className="opacity-0 pointer-events-none" />
    </div>
  );
}
