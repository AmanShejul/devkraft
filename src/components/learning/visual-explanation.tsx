import { Network, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import type { VisualExplanation } from "@/features/teacher-portal/contracts";

interface VisualGuide {
  id: string;
  title: string;
  visualExplanation: VisualExplanation;
}

const nodeWidth = 204;
const nodeHeight = 86;

function nodePosition(index: number) {
  return { x: 24 + (index % 3) * 244, y: 24 + Math.floor(index / 3) * 148 };
}

function textLines(value: string, length: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > length && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function GuideDiagram({ guide }: { guide: VisualGuide }) {
  const positions = new Map(guide.visualExplanation.nodes.map((node, index) => [node.id, nodePosition(index)]));
  const rows = Math.ceil(guide.visualExplanation.nodes.length / 3);
  const height = 48 + rows * 148;
  const markerId = `visual-arrow-${guide.id}`;

  return <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b0f11] p-3">
    <svg viewBox={`0 0 760 ${height}`} role="img" aria-label={`${guide.title}: ${guide.visualExplanation.title}`} className="min-w-[700px] w-full">
      <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="rgb(232 185 106 / .8)" /></marker></defs>
      {guide.visualExplanation.edges.map((edge, index) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const startX = from.x + nodeWidth;
        const startY = from.y + nodeHeight / 2;
        const endX = to.x;
        const endY = to.y + nodeHeight / 2;
        const bend = Math.max(28, Math.abs(endX - startX) * 0.35);
        return <g key={`${edge.from}-${edge.to}-${index}`}>
          <path d={`M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`} fill="none" stroke="rgb(232 185 106 / .42)" strokeWidth="1.5" markerEnd={`url(#${markerId})`} />
          <text x={(startX + endX) / 2} y={(startY + endY) / 2 - 8} textAnchor="middle" className="fill-white/40 text-[10px]">{edge.label}</text>
        </g>;
      })}
      {guide.visualExplanation.nodes.map((node, index) => {
        const position = nodePosition(index);
        const descriptionLines = textLines(node.description, 31);
        return <g key={node.id}>
          <title>{`${node.label}: ${node.description}`}</title>
          <rect x={position.x} y={position.y} width={nodeWidth} height={nodeHeight} rx="14" fill="rgb(28 35 37)" stroke="rgb(232 185 106 / .45)" />
          <circle cx={position.x + 18} cy={position.y + 19} r="5" fill="rgb(232 185 106)" />
          <text x={position.x + 32} y={position.y + 23} className="fill-white text-[13px] font-semibold">{node.label.slice(0, 26)}</text>
          {descriptionLines.map((line, lineIndex) => <text key={line} x={position.x + 16} y={position.y + 49 + lineIndex * 16} className="fill-white/45 text-[10px]">{line}</text>)}
        </g>;
      })}
    </svg>
  </div>;
}

export function VisualExplanationSection({ guides }: { guides: readonly VisualGuide[] }) {
  return <SectionCard className="overflow-hidden border-white/10 bg-[#111619] p-0">
    <div className="border-b border-white/10 px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/[.08] text-brand"><Network size={18} /></span>
          <div><p className="eyebrow text-brand">Learn visually</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-ink">See how your notes connect.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Published lesson material becomes a clear map of ideas, relationships, and key takeaways.</p></div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white/45"><Sparkles size={12} className="text-brand" /> Visual guide</span>
      </div>
    </div>

    {guides.length === 0 ? <div className="mx-5 my-6 flex items-start gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-5 sm:mx-7"><Network size={18} className="mt-0.5 shrink-0 text-white/30" /><p className="text-sm leading-6 text-muted">A visual guide will appear here after a teacher publishes notes-based material.</p></div> : <div className="space-y-5 p-5 sm:p-7">
      {guides.map((guide) => <article key={guide.id} className="rounded-2xl border border-white/10 bg-[#0d1214] p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand">{guide.title}</p><h3 className="mt-2 text-lg font-semibold text-ink">{guide.visualExplanation.title}</h3></div><span className="text-xs text-white/35">{guide.visualExplanation.nodes.length} key ideas</span></div>
        <p className="mb-5 max-w-3xl text-sm leading-6 text-muted">{guide.visualExplanation.summary}</p>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
          <GuideDiagram guide={guide} />
          <aside className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/40">Key ideas</p><div className="mt-3 space-y-3">{guide.visualExplanation.nodes.map((node, index) => <div key={node.id} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand/[.1] text-[10px] font-bold text-brand">{String(index + 1).padStart(2, "0")}</span><div><p className="text-xs font-semibold text-white/80">{node.label}</p><p className="mt-1 text-xs leading-5 text-white/45">{node.description}</p></div></div>)}</div></aside>
        </div>
      </article>)}
    </div>}
  </SectionCard>;
}
