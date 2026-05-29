import React, { useEffect, useRef } from 'react';
import LogStream from './LogStream';

export default function BoardRoom({ logs, streamingPlanner, streamingVerifier, toolEvents }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, streamingPlanner, streamingVerifier, toolEvents]);

  return (
    <div className="w-1/2 flex flex-col border border-slate-800 p-4 rounded-xl bg-slate-900/50">
      <h2 className="text-xl font-bold text-amber-500 border-b border-slate-800 pb-2">三权博弈与刑名对账实时流</h2>

      <div ref={containerRef} className="flex-1 overflow-y-auto flex flex-col gap-3 mt-4 text-xs">
        {logs.length === 0 && !streamingPlanner && !streamingVerifier && toolEvents.length === 0 && (
          <div className="text-slate-600 text-center mt-8">等待工作流启动...</div>
        )}

        {logs.map((log, index) => (
          <LogStream key={index} log={log} />
        ))}

        {toolEvents.map((te, index) => (
          <div key={`tool-${index}`} className="p-3 rounded-lg border bg-orange-950/30 border-orange-800/60 text-orange-300">
            <div className="flex justify-between font-bold mb-1">
              <span>{te.event === 'tool_start' ? `[TOOL·调用] ${te.name}` : `[TOOL·返回] ${te.name}`}</span>
              <span>{te.timestamp}</span>
            </div>
            {te.event === 'tool_start' && te.args && (
              <pre className="mt-1 p-2 bg-black/40 rounded border border-slate-900 overflow-x-auto text-[11px] text-orange-200/70">
                {JSON.stringify(te.args, null, 2)}
              </pre>
            )}
            {te.event === 'tool_result' && te.result && (
              <pre className="mt-1 p-2 bg-black/40 rounded border border-slate-900 overflow-x-auto text-[11px] text-orange-200/70 max-h-32">
                {typeof te.result === 'string' ? te.result : JSON.stringify(te.result, null, 2)}
              </pre>
            )}
          </div>
        ))}

        {streamingPlanner && (
          <div className="p-3 rounded-lg border bg-blue-950/40 border-blue-800/60 text-blue-300">
            <div className="flex justify-between font-bold mb-1">
              <span>[PLAN·LIVE]</span>
            </div>
            <pre className="text-[11px] whitespace-pre-wrap text-blue-200/80">
              {streamingPlanner}
              <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-0.5 animate-pulse align-middle" />
            </pre>
          </div>
        )}

        {streamingVerifier && (
          <div className="p-3 rounded-lg border bg-purple-950/40 border-purple-800/60 text-purple-300">
            <div className="flex justify-between font-bold mb-1">
              <span>[VERIFY·LIVE]</span>
            </div>
            <pre className="text-[11px] whitespace-pre-wrap text-purple-200/80">
              {streamingVerifier}
              <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse align-middle" />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
