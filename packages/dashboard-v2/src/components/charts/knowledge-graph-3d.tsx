"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";

// ForceGraph3D is client-side only (Three.js/DOM requirements)
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

const INITIAL_DATA = {
  nodes: [
    { id: "FIDC", group: 1, val: 20, desc: "Paganini FIDC I" },
    { id: "CVM 175", group: 1, val: 12, desc: "Regulamento Geral de Fundos" },
    { id: "BACEN", group: 1, val: 10, desc: "Circular 3.978/2020" },
    { id: "Compliance", group: 2, val: 15, desc: "6-Gate Guardrail Engine" },
    { id: "PDD", group: 2, val: 8, desc: "Provisão de Devedores Duvidosos" },
    { id: "Covenant", group: 2, val: 8, desc: "Liquidez/Subordinação/Inadimplência" },
    { id: "NAV", group: 3, val: 10, desc: "Net Asset Value" },
    { id: "Cedente", group: 4, val: 8, desc: "Vendedor de Recebíveis" },
    { id: "Sacado", group: 4, val: 8, desc: "Pagador do Recebível" },
    { id: "Administrador", group: 5, val: 10, desc: "Vivaldi DTVM" },
    { id: "Custodiante", group: 5, val: 10, desc: "Oliveira Trust" },
  ],
  links: [
    { source: "FIDC", target: "CVM 175" },
    { source: "FIDC", target: "Compliance" },
    { source: "FIDC", target: "NAV" },
    { source: "Compliance", target: "CVM 175" },
    { source: "Compliance", target: "BACEN" },
    { source: "Compliance", target: "PDD" },
    { source: "Compliance", target: "Covenant" },
    { source: "NAV", target: "PDD" },
    { source: "FIDC", target: "Cedente" },
    { source: "FIDC", target: "Sacado" },
    { source: "FIDC", target: "Administrador" },
    { source: "FIDC", target: "Custodiante" },
    { source: "Cedente", target: "Compliance" },
    { source: "Sacado", target: "Compliance" },
  ],
};

const COLORS: Record<number, string> = {
  1: "hsl(150 100% 50%)", // Green (FIDC/Reg)
  2: "hsl(180 100% 50%)", // Cyan (Compliance/Guardrails)
  3: "hsl(210 100% 60%)", // Blue (NAV)
  4: "hsl(45 100% 50%)",  // Amber (Participants)
  5: "hsl(0 84% 60%)",    // Red (Admins)
};

export default function KnowledgeGraph3D() {
  const fgRef = useRef<any>(null);
  const [data, setData] = useState(INITIAL_DATA);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="flex items-center justify-center h-full font-mono text-[10px] text-text-4">
      INITIALIZING 3D ENGINE...
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "hsl(220 20% 4% / 0.8)" }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={(node: any) => `
          <div style="background: rgba(10, 10, 15, 0.9); border: 1px solid var(--border); padding: 8px; font-family: var(--font-mono); border-radius: var(--radius);">
            <div style="color: var(--accent); font-weight: 700; margin-bottom: 4px;">${node.id}</div>
            <div style="color: var(--text-2); font-size: 10px;">${node.desc}</div>
          </div>
        `}
        nodeColor={(node: any) => COLORS[node.group as keyof typeof COLORS] || "white"}
        nodeVal={(node: any) => node.val}
        nodeOpacity={0.9}
        linkWidth={1}
        linkColor={() => "rgba(0, 255, 128, 0.2)"}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "var(--accent)"}
        showNavInfo={false}
        enablePointerInteraction={true}
        enableNodeDrag={true}
        onNodeClick={(node) => {
          // Center on node
          const distance = 100;
          const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
          fgRef.current.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            3000
          );
        }}
      />
      
      {/* HUD overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", letterSpacing: "0.12em", color: "var(--accent)" }}>
          KNOWLEDGE GRAPH — V2.0 (LIVE)
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <div className="flex flex-col gap-1 items-end">
          {Object.entries(COLORS).map(([group, color]) => (
            <div key={group} className="flex items-center gap-2">
              <span style={{ fontSize: "9px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>
                {group === "1" ? "CORE / REG" : group === "2" ? "GUARDRAILS" : group === "3" ? "NAV" : group === "4" ? "ENTITIES" : "PARTICIPANTS"}
              </span>
              <div style={{ width: 6, height: 6, background: color, borderRadius: "50%", boxShadow: `0 0 4px ${color}` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
