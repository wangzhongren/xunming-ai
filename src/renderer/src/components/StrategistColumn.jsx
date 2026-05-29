import React, { useRef, useEffect } from 'react';

export default function StrategistColumn({ streaming, done, active, plan, feedback }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streaming, plan, feedback]);

  const borderColor = active ? 'border-teal-500/60' : done ? 'border-teal-800/40' : 'border-slate-800';
  const glow = active ? 'shadow-[0_0_15px_rgba(20,184,166,0.15)]' : '';

  return (
    <div className={`flex-1 min-w-0 overflow-hidden flex flex-col border-r ${borderColor} bg-slate-900/30 transition-all duration-500 ${glow}`}>
      <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-teal-400 animate-pulse' : done ? 'bg-teal-600' : 'bg-slate-700'}`} />
        <span className="text-sm font-bold text-teal-400">内阁 Strategist</span>
        <span className="text-[11px] text-slate-600 ml-auto">规划</span>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 text-[13px] flex flex-col gap-3">
        {/* Plan */}
        {plan && (
          <div className="p-3 rounded-lg border border-teal-800/40 bg-teal-950/20">
            <div className="text-teal-400 text-[11px] font-bold mb-1">执行方案</div>
            <pre className="whitespace-pre-wrap text-teal-200/80 leading-relaxed">{plan}</pre>
          </div>
        )}

        {/* Cabinet feedback (rejection analysis) */}
        {feedback && (
          <div className="p-3 rounded-lg border border-red-800/40 bg-red-950/20">
            <div className="text-red-400 text-[11px] font-bold mb-1">驳回研判</div>
            <div className="text-red-300/80 leading-relaxed whitespace-pre-wrap">{feedback}</div>
          </div>
        )}

        {/* Streaming */}
        {streaming && (
          <pre className="whitespace-pre-wrap text-teal-200/80 leading-relaxed">
            {streaming}
            <span className="inline-block w-1.5 h-3.5 bg-teal-400 ml-0.5 animate-pulse align-middle" />
          </pre>
        )}

        {/* Empty states */}
        {!streaming && !plan && !feedback && (
          !active && !done ? (
            <div className="text-slate-600 text-center mt-8">等待立法...</div>
          ) : !active && done ? (
            <div className="text-teal-300/60 italic text-center mt-8">方案已制定</div>
          ) : active ? (
            <div className="text-teal-400/50 animate-pulse text-center mt-8">规划中...</div>
          ) : null
        )}
      </div>
    </div>
  );
}
