import React from 'react';

export default function EvidenceColumn({ active, done, toolEvents, evidence }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto p-5 text-[13px] flex flex-col gap-2.5">
        {evidence && (
          <div className="p-3 border border-ibm-border bg-ibm-layer">
            <div className="text-ibm-pink text-[11px] font-semibold mb-2 uppercase tracking-wider">Audit Report</div>
            <pre className="whitespace-pre-wrap text-ibm-text-secondary leading-relaxed text-xs">{evidence}</pre>
          </div>
        )}

        {toolEvents.map((te, i) => (
          <div key={i} className="p-2.5 border border-ibm-border bg-ibm-layer text-xs">
            <div className="font-semibold mb-1 text-ibm-text-secondary">
              {te.event === 'tool_start' ? 'INVOKE' : 'RESULT'}: {te.name}
            </div>
            <pre className="whitespace-pre-wrap text-ibm-text-tertiary max-h-32 overflow-y-auto text-[11px]">
              {te.event === 'tool_start'
                ? JSON.stringify(te.args, null, 2)
                : (typeof te.result === 'string' ? te.result.substring(0, 500) : JSON.stringify(te.result, null, 2))}
            </pre>
          </div>
        ))}

        {!evidence && toolEvents.length === 0 && (
          <>
            {active && <div className="text-ibm-text-disabled text-center mt-12">Running verification checks...</div>}
            {!active && !done && <div className="text-ibm-text-disabled text-center mt-12">Waiting for execution...</div>}
            {done && <div className="text-ibm-text-disabled italic text-center mt-12">Audit complete.</div>}
          </>
        )}
      </div>
    </div>
  );
}
