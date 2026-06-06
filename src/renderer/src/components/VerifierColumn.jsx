import React, { useRef, useEffect } from 'react';

export default function VerifierColumn({ streaming, passed, active }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streaming]);

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 text-[13px] flex flex-col gap-3">
        {passed ? (
          <div className="p-4 border border-ibm-green/40 bg-ibm-green/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-ibm-green" />
              <span className="font-semibold text-ibm-green text-xs uppercase tracking-wider">Verified</span>
            </div>
            <div className="text-ibm-text-secondary text-xs leading-relaxed">
              All criteria satisfied. Output delivered.
            </div>
          </div>
        ) : !active && passed === null ? (
          <div className="text-ibm-text-disabled text-center mt-12">Waiting for audit report...</div>
        ) : streaming ? (
          <pre className="whitespace-pre-wrap text-ibm-text-secondary leading-relaxed">
            {streaming}
            <span className="inline-block w-2 h-4 bg-ibm-purple ml-0.5 align-middle" />
          </pre>
        ) : (
          <div className="text-ibm-text-disabled text-center mt-12">Reviewing evidence...</div>
        )}
      </div>
    </div>
  );
}
