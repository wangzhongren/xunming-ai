import React from 'react';

export default function EvidenceColumn({ active, done, toolEvents, evidence }) {
  const borderColor = active ? 'border-pink-500/60' : done ? 'border-pink-800/40' : 'border-slate-800';
  const glow = active ? 'shadow-[0_0_15px_rgba(236,72,153,0.15)]' : '';

  return (
    <div className={`flex-1 min-w-0 overflow-hidden flex flex-col border-r ${borderColor} bg-slate-900/30 transition-all duration-500 ${glow}`}>
      <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-pink-400 animate-pulse' : done ? 'bg-pink-600' : 'bg-slate-700'}`} />
        <span className="text-sm font-bold text-pink-400">检察 Inspector</span>
        <span className="text-[11px] text-slate-600 ml-auto">检察</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 text-[13px] flex flex-col gap-2">
        {/* Evidence report */}
        {evidence && (
          <div className="p-3 rounded-lg border border-pink-800/40 bg-pink-950/20">
            <div className="text-pink-400 text-[11px] font-bold mb-1">检察报告</div>
            <pre className="whitespace-pre-wrap text-pink-200/80 leading-relaxed">{evidence}</pre>
          </div>
        )}

        {/* Tool events */}
        {toolEvents.map((te, i) => (
          <div key={i} className={`p-2 rounded border text-[12px] ${
            te.event === 'tool_start' ? 'bg-pink-950/30 border-pink-800/40 text-pink-300'
              : 'bg-pink-950/20 border-pink-900/30 text-pink-300/70'
          }`}>
            <div className="font-bold mb-0.5">{te.event === 'tool_start' ? '调用' : '返回'}: {te.name}</div>
            <pre className="whitespace-pre-wrap text-slate-400 max-h-24 overflow-y-auto">
              {te.event === 'tool_start'
                ? JSON.stringify(te.args, null, 2)
                : (typeof te.result === 'string' ? te.result.substring(0, 500) : JSON.stringify(te.result))}
            </pre>
          </div>
        ))}

        {/* Status */}
        {!evidence && toolEvents.length === 0 && (
          <>
            {active && <div className="text-pink-400/50 animate-pulse text-center mt-8">逐条运行验证中...</div>}
            {!active && !done && <div className="text-slate-600 text-center mt-8">等待执行...</div>}
            {done && <div className="text-pink-300/60 italic text-center mt-8">检察完成</div>}
          </>
        )}
      </div>
    </div>
  );
}
