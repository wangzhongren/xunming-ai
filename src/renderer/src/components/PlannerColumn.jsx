import React, { useRef, useEffect } from 'react';

export default function PlannerColumn({ streaming, done, active, criteria }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streaming]);

  const borderColor = active ? 'border-blue-500/60' : done ? 'border-blue-800/40' : 'border-slate-800';
  const glow = active ? 'shadow-[0_0_15px_rgba(59,130,246,0.15)]' : '';

  return (
    <div className={`flex-1 min-w-0 overflow-hidden flex flex-col border-r ${borderColor} bg-slate-900/30 transition-all duration-500 ${glow}`}>
      <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${
          active ? 'bg-blue-400 animate-pulse' : done ? 'bg-blue-600' : 'bg-slate-700'
        }`} />
        <span className="text-sm font-bold text-blue-400">立法 · Planner</span>
        <span className="text-[11px] text-slate-600 ml-auto">立名</span>
        {done && <span className="text-[11px] text-blue-400 ml-1">{criteria.length}条</span>}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 text-[13px] flex flex-col gap-2">
        {!active && !done && criteria.length === 0 ? (
          <div className="text-slate-600 text-center mt-8">等待法案输入...</div>
        ) : done && criteria.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="text-blue-300/80 font-bold mb-1">法度标尺已铸造 ({criteria.length}条):</div>
            {criteria.map((item, i) => (
              <div key={item.id || i} className="p-2.5 rounded border border-blue-800/40 bg-blue-950/20 flex gap-2">
                <span className="text-blue-400 font-bold shrink-0 mt-0.5">
                  [{item.id || i + 1}]
                </span>
                <span className="text-blue-200/80 leading-relaxed">{item.rule}</span>
              </div>
            ))}
            <div className="text-blue-400/40 text-[11px] text-center mt-2">—— 法度已下发行官执行 ——</div>
          </div>
        ) : streaming ? (
          <pre className="whitespace-pre-wrap text-blue-200/80 leading-relaxed">
            {streaming}
            <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-0.5 animate-pulse align-middle" />
          </pre>
        ) : done ? (
          <div className="text-blue-300/60 italic text-center mt-8">法度标尺已铸造</div>
        ) : (
          <div className="text-blue-400/50 animate-pulse text-center mt-8">立法官正在审视法案...</div>
        )}
      </div>
    </div>
  );
}
