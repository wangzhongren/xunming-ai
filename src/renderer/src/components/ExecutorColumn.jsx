import React, { useRef, useEffect } from 'react';

export default function ExecutorColumn({ streaming, status, finalResult, output, rounds, done, active }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streaming, rounds, output]);

  const displayText = finalResult || output;

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 text-[13px]">

        {/* Tool call rounds */}
        {rounds.filter(r => r.text || r.toolName).map((r, i) => (
          <div key={i} className="border border-ibm-border bg-ibm-layer mb-3">
            {r.text && (
              <div className="px-3 py-2.5 text-ibm-text-secondary whitespace-pre-wrap leading-relaxed text-xs">
                {r.text}
              </div>
            )}
            {r.toolName && (
              <div>
                <div className={`px-3 py-2 flex items-center gap-2 text-xs border-t border-ibm-border ${r.text ? '' : ''}`}>
                  <span className="text-[10px] font-semibold text-ibm-amber uppercase tracking-wider">Exec</span>
                  <span className="text-ibm-text font-semibold">{r.toolName}</span>
                </div>
                {r.toolResult && (
                  <pre className="px-3 py-2 text-ibm-text-tertiary text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed bg-ibm-bg border-t border-ibm-border">
                    {typeof r.toolResult === 'string' ? r.toolResult : JSON.stringify(r.toolResult, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Streaming output */}
        {streaming && (
          <div className="border border-ibm-border bg-ibm-layer p-3 text-ibm-text-secondary whitespace-pre-wrap leading-relaxed text-xs mb-3">
            {streaming}
            <span className="inline-block w-2 h-4 bg-ibm-amber ml-0.5 align-middle" />
          </div>
        )}

        {/* Final output */}
        {!streaming && displayText && (
          <div className="border border-ibm-border bg-ibm-layer p-3 text-ibm-text-secondary whitespace-pre-wrap leading-relaxed text-xs">
            {displayText}
          </div>
        )}

        {/* Empty states */}
        {!streaming && !displayText && rounds.length === 0 && (
          <div className="text-ibm-text-disabled text-center mt-12">
            {status || (!active && !done ? 'Awaiting execution plan...' : done ? 'Output delivered for audit.' : '')}
          </div>
        )}
      </div>
    </div>
  );
}
