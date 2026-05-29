import React from 'react';

const stageColors = {
  PLAN: 'bg-blue-950/40 border-blue-800/60 text-blue-300',
  EXECUTE: 'bg-yellow-950/30 border-yellow-800/60 text-yellow-200',
  VERIFY: 'bg-purple-950/40 border-purple-800/60 text-purple-300',
  ROLLBACK: 'bg-red-950/50 border-red-800 text-red-400',
  SUCCESS: 'bg-emerald-950/40 border-emerald-800 text-emerald-300',
  FAIL: 'bg-red-950/60 border-red-700 text-red-300',
};

export default function LogStream({ log }) {
  const colorClass = stageColors[log.stage] || 'bg-slate-900 border-slate-700 text-slate-400';

  return (
    <div className={`p-3 rounded-lg border ${colorClass} ${log.stage === 'ROLLBACK' ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between font-bold mb-1">
        <span>[{log.stage}]</span>
        <span>{log.timestamp}</span>
      </div>
      <p className="text-slate-300">{log.message}</p>
      {log.detail && (
        <pre className="mt-2 p-2 bg-black/40 rounded border border-slate-900 overflow-x-auto text-[11px] max-h-36 text-slate-400">
          {typeof log.detail === 'object' ? JSON.stringify(log.detail, null, 2) : log.detail}
        </pre>
      )}
    </div>
  );
}
