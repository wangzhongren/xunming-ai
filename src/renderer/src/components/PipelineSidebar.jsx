import React from 'react';

const STAGES = [
  { key: 'planner',    label: 'Planner',    cn: '立法',   color: 'blue' },
  { key: 'strategist', label: 'Strategist', cn: '内阁',   color: 'teal' },
  { key: 'executor',   label: 'Executor',   cn: '行政',   color: 'amber' },
  { key: 'inspector',  label: 'Inspector',  cn: '检察',   color: 'pink' },
  { key: 'verifier',   label: 'Verifier',   cn: '司法',   color: 'purple' },
];

const BAR = {
  blue:   'bg-ibm-blue',
  teal:   'bg-ibm-teal',
  amber:  'bg-ibm-amber',
  pink:   'bg-ibm-pink',
  purple: 'bg-ibm-purple',
};

export default function PipelineSidebar({ stages, focusedStage, onFocus, retryCount, maxRetries, running }) {
  return (
    <div className="w-52 shrink-0 flex flex-col border-r border-ibm-border bg-ibm-bg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ibm-border flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ibm-text-tertiary tracking-[0.15em] uppercase">Pipeline</span>
        {running && (
          <span className="text-[10px] text-ibm-blue font-medium">Running</span>
        )}
      </div>

      {/* Stage Cards */}
      <div className="flex-1 flex flex-col py-2">
        {STAGES.map((stage) => {
          const status = stages[stage.key] || 'idle';
          const isFocused = focusedStage === stage.key;
          const isActive = status === 'active';
          const colorClass = BAR[stage.color];

          // Status bar: always present, color varies by state
          const barColor = isActive
            ? colorClass
            : status === 'done'
              ? colorClass + ' opacity-50'
              : 'bg-transparent';

          // Card background
          const cardBg = isFocused
            ? 'bg-ibm-layer-active'
            : 'bg-transparent hover:bg-ibm-layer-hover';

          // Text color
          const labelColor = isFocused || isActive
            ? 'text-ibm-text'
            : status === 'done'
              ? 'text-ibm-text-secondary'
              : 'text-ibm-text-tertiary';

          return (
            <button
              key={stage.key}
              onClick={() => onFocus(stage.key)}
              className={`flex items-center gap-0 w-full text-left transition-colors duration-150 ${cardBg}`}
            >
              {/* Left status bar: 3px wide, full height */}
              <div className={`w-[3px] self-stretch shrink-0 rounded-r-sm transition-colors duration-300 ${barColor}`} />

              <div className="flex-1 flex items-center gap-2.5 py-2.5 px-3 min-w-0">
                {/* Stage index number */}
                <span className={`text-[11px] font-semibold w-4 text-right shrink-0 ${
                  isActive ? colorClass.replace('bg-', 'text-') :
                  status === 'done' ? 'text-ibm-text-disabled' : 'text-ibm-text-disabled'
                }`}>
                  {STAGES.indexOf(stage) + 1}
                </span>

                {/* Label + sub */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] font-medium leading-tight ${labelColor}`}>
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-ibm-text-disabled leading-tight mt-0.5">
                    {stage.cn}
                  </div>
                </div>

                {/* Done check */}
                {status === 'done' && (
                  <span className="text-[11px] text-ibm-green shrink-0">&#10003;</span>
                )}
                {isActive && (
                  <span className="text-[11px] text-ibm-text-tertiary shrink-0">&#9679;</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className="px-4 py-3 border-t border-ibm-border text-[10px] text-ibm-text-tertiary space-y-1.5">
        <div className="flex justify-between">
          <span>Retries</span>
          <span className={retryCount > 0 ? 'text-ibm-amber font-medium' : 'text-ibm-text-disabled'}>
            {retryCount}/{maxRetries}
          </span>
        </div>
      </div>
    </div>
  );
}
