import React, { useRef, useEffect } from 'react';

export default function VerifierColumn({ streaming, passed, active }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streaming]);

  const borderColor = active ? 'border-purple-500/60'
    : passed ? 'border-emerald-800/60' : 'border-slate-800';
  const glow = active ? 'shadow-[0_0_15px_rgba(168,85,247,0.15)]'
    : passed ? 'shadow-[0_0_15px_rgba(52,211,153,0.1)]' : '';

  return (
    <div className={`flex-1 min-w-0 overflow-hidden flex flex-col ${borderColor} bg-slate-900/30 transition-all duration-500 ${glow}`}>
      <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${
          active ? 'bg-purple-400 animate-pulse' : passed ? 'bg-emerald-400' : 'bg-slate-700'
        }`} />
        <span className="text-sm font-bold text-purple-400">司法 Verifier</span>
        <span className="text-[11px] text-slate-600 ml-auto">审合</span>
        {passed && <span className="text-[11px] text-emerald-400 ml-1">通过</span>}
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 text-[13px] flex flex-col gap-2">
        {passed ? (
          <div className="p-3 rounded border border-emerald-800/60 bg-emerald-950/30">
            <div className="font-bold text-emerald-400 mb-1">名实相符 · 通过</div>
            <div className="text-emerald-300/60 text-[12px]">司法审查通过，产出已交付。</div>
          </div>
        ) : !active && !passed ? (
          <div className="text-slate-600 text-center mt-8">等待行政产出移送...</div>
        ) : streaming ? (
          <pre className="whitespace-pre-wrap text-purple-200/80 leading-relaxed">
            {streaming}
            <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse align-middle" />
          </pre>
        ) : (
          <div className="text-purple-400/50 animate-pulse text-center mt-8">司法启封审查中...</div>
        )}
      </div>
    </div>
  );
}
