import React, { useEffect, useState, useCallback } from 'react';

export default function FlowLines({ highlight, columnsRef }) {
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const updateDims = useCallback(() => {
    if (columnsRef.current) {
      const rect = columnsRef.current.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    }
  }, [columnsRef]);

  useEffect(() => {
    updateDims();
    const ro = new ResizeObserver(updateDims);
    if (columnsRef.current) ro.observe(columnsRef.current);
    return () => ro.disconnect();
  }, [columnsRef, updateDims]);

  const { w, h } = dims;
  if (w === 0 || h === 0) return null;

  const colW = w / 3;
  // Arrow endpoints at 40% height (top section, above content area)
  const y = h * 0.38;

  // Arrow from Planner (right edge) to Executor (left edge)
  const pRight = colW;
  const eLeft = colW;
  const eRight = colW * 2;
  const vLeft = colW * 2;

  // Arrow back from Verifier to Executor (rollback)
  const yBack = h * 0.48;

  const isPlanExec = highlight === 'plan-exec';
  const isExecVerify = highlight === 'exec-verify';
  const isVerifyExec = highlight === 'verify-exec';

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width={w} height={h}>
      <defs>
        <linearGradient id="gPlanExec" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="gExecVerify" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="gVerifyExec" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Planner → Executor arrow */}
      <g opacity={isPlanExec ? 1 : 0.25}>
        <path
          d={`M ${pRight - 10} ${y} L ${eLeft + 10} ${y}`}
          stroke="url(#gPlanExec)"
          strokeWidth={isPlanExec ? 2.5 : 1.5}
          strokeDasharray={isPlanExec ? "8 4" : "4 6"}
          fill="none"
          className={isPlanExec ? 'flow-dash' : ''}
        />
        <polygon
          points={`${eLeft + 4},${y - 5} ${eLeft + 14},${y} ${eLeft + 4},${y + 5}`}
          fill={isPlanExec ? "#f59e0b" : "#4b5563"}
        />
        {isPlanExec && (
          <text x={colW - 30} y={y - 10} fill="#60a5fa" fontSize="10" textAnchor="middle" fontWeight="bold">
            立法标准 →
          </text>
        )}
      </g>

      {/* Executor → Verifier arrow */}
      <g opacity={isExecVerify ? 1 : 0.25}>
        <path
          d={`M ${eRight - 10} ${y} L ${vLeft + 10} ${y}`}
          stroke="url(#gExecVerify)"
          strokeWidth={isExecVerify ? 2.5 : 1.5}
          strokeDasharray={isExecVerify ? "8 4" : "4 6"}
          fill="none"
          className={isExecVerify ? 'flow-dash' : ''}
        />
        <polygon
          points={`${vLeft + 4},${y - 5} ${vLeft + 14},${y} ${vLeft + 4},${y + 5}`}
          fill={isExecVerify ? "#a855f7" : "#4b5563"}
        />
        {isExecVerify && (
          <text x={colW * 2 - 30} y={y - 10} fill="#fbbf24" fontSize="10" textAnchor="middle" fontWeight="bold">
            移送审合 →
          </text>
        )}
      </g>

      {/* Verifier → Executor (rollback) */}
      <g opacity={isVerifyExec ? 1 : 0}>
        <path
          d={`M ${vLeft + 10} ${yBack} L ${eRight - 10} ${yBack}`}
          stroke="url(#gVerifyExec)"
          strokeWidth={isVerifyExec ? 2.5 : 1.5}
          strokeDasharray="6 4"
          fill="none"
          className={isVerifyExec ? 'flow-dash-reverse' : ''}
        />
        <polygon
          points={`${eRight - 4},${yBack - 5} ${eRight - 14},${yBack} ${eRight - 4},${yBack + 5}`}
          fill={isVerifyExec ? "#ef4444" : "#4b5563"}
        />
        {isVerifyExec && (
          <text x={colW * 2 - 30} y={yBack + 16} fill="#f87171" fontSize="10" textAnchor="middle" fontWeight="bold">
            ← 驳回重做
          </text>
        )}
      </g>
    </svg>
  );
}
