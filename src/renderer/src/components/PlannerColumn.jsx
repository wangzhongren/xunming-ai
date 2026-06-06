import React, { useRef, useEffect } from 'react';

export default function PlannerColumn({ streaming, done, active, criteria }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streaming]);

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 text-[13px] flex flex-col gap-3">
        {!active && !done && criteria.length === 0 ? (
          <div className="text-ibm-text-disabled text-center mt-12">Awaiting input...</div>
        ) : done && criteria.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <div className="text-ibm-text-secondary font-semibold text-xs mb-1 uppercase tracking-wider">
              Acceptance Criteria ({criteria.length})
            </div>
            {criteria.map((item, i) => (
              <div key={item.id || i} className="p-3 border border-ibm-border bg-ibm-layer flex gap-3">
                <span className="text-ibm-blue font-semibold shrink-0 text-xs mt-0.5">
                  [{item.id || i + 1}]
                </span>
                <span className="text-ibm-text-secondary leading-relaxed">{item.rule}</span>
              </div>
            ))}
            <div className="text-ibm-text-disabled text-[11px] text-center mt-2">
              Criteria defined. Handing off to Strategist.
            </div>
          </div>
        ) : streaming ? (
          <pre className="whitespace-pre-wrap text-ibm-text-secondary leading-relaxed">
            {streaming}
            <span className="inline-block w-2 h-4 bg-ibm-blue ml-0.5 align-middle" />
          </pre>
        ) : done ? (
          <div className="text-ibm-text-disabled italic text-center mt-12">Criteria defined.</div>
        ) : (
          <div className="text-ibm-text-disabled text-center mt-12">Analyzing requirements...</div>
        )}
      </div>
    </div>
  );
}
