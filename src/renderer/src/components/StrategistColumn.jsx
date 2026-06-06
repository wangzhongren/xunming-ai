import React, { useRef, useEffect } from 'react';

export default function StrategistColumn({ streaming, done, active, plan, feedback }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streaming, plan, feedback]);

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 text-[13px] flex flex-col gap-3">
        {plan && (
          <div className="p-3 border border-ibm-border bg-ibm-layer">
            <div className="text-ibm-teal text-[11px] font-semibold mb-2 uppercase tracking-wider">Execution Plan</div>
            <pre className="whitespace-pre-wrap text-ibm-text-secondary leading-relaxed text-xs">{plan}</pre>
          </div>
        )}

        {feedback && (
          <div className="p-3 border border-ibm-red/40 bg-ibm-red/5">
            <div className="text-ibm-red text-[11px] font-semibold mb-1 uppercase tracking-wider">Rejection Analysis</div>
            <div className="text-ibm-text-secondary leading-relaxed whitespace-pre-wrap text-xs">{feedback}</div>
          </div>
        )}

        {streaming && (
          <pre className="whitespace-pre-wrap text-ibm-text-secondary leading-relaxed">
            {streaming}
            <span className="inline-block w-2 h-4 bg-ibm-teal ml-0.5 align-middle" />
          </pre>
        )}

        {!streaming && !plan && !feedback && (
          !active && !done ? (
            <div className="text-ibm-text-disabled text-center mt-12">Waiting for criteria...</div>
          ) : !active && done ? (
            <div className="text-ibm-text-disabled italic text-center mt-12">Plan ready.</div>
          ) : active ? (
            <div className="text-ibm-text-disabled text-center mt-12">Formulating plan...</div>
          ) : null
        )}
      </div>
    </div>
  );
}
