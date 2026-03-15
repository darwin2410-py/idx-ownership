import { notFound } from 'next/navigation';
import { findHolderGraph } from '@/lib/repositories/graph-repository';
import { GraphCanvas } from '@/components/graph-canvas';

export const revalidate = 0;

export default async function HolderGraphPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const holderName = decodeURIComponent(name);

  const graphData = await findHolderGraph(holderName);
  if (!graphData) return notFound();

  return (
    <div className="flex flex-col h-screen">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-none">
        <h1 className="text-xl font-semibold text-gray-900 truncate">
          {graphData.centerLabel} — {graphData.stocks.length} emiten
        </h1>
        <p className="text-sm text-gray-500 mt-1">Kepemilikan saham pada periode terkini</p>
      </div>
      <div className="flex-1 min-h-0">
        <GraphCanvas data={graphData} />
      </div>
    </div>
  );
}
