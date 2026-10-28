import React from 'react';

interface HistogramProps {
  data: number[];
  binsCount?: number;
  title?: string;
  xLabel?: string;
}

export const HistogramChart: React.FC<HistogramProps> = ({
  data,
  binsCount = 10,
  title = 'Distribution Histogram',
  xLabel = 'Value',
}) => {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binWidth = range / binsCount;

  const bins = new Array(binsCount).fill(0);
  for (const v of data) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= binsCount) idx = binsCount - 1;
    bins[idx]++;
  }

  const maxFreq = Math.max(...bins, 1);
  const width = 460;
  const height = 200;
  const padLeft = 40;
  const padBottom = 30;
  const padTop = 20;
  const padRight = 20;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const barW = plotW / binsCount;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
        <span className="text-2xs text-slate-500 font-mono">N = {data.length}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padTop + plotH * (1 - ratio);
          const freqLabel = Math.round(maxFreq * ratio);
          return (
            <g key={ratio}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="JetBrains Mono"
                textAnchor="end"
              >
                {freqLabel}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {bins.map((freq, i) => {
          const barH = (freq / maxFreq) * plotH;
          const x = padLeft + i * barW;
          const y = padTop + plotH - barH;
          return (
            <g key={i}>
              <rect
                x={x + 2}
                y={y}
                width={Math.max(1, barW - 4)}
                height={barH}
                fill="#3b82f6"
                opacity="0.85"
                rx="2"
                className="hover:opacity-100 transition-opacity cursor-pointer"
              >
                <title>{`Range: ${(min + i * binWidth).toFixed(2)} - ${(min + (i + 1) * binWidth).toFixed(2)} (Count: ${freq})`}</title>
              </rect>
              {/* X tick labels */}
              {i % 2 === 0 && (
                <text
                  x={x + barW / 2}
                  y={height - 10}
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  {(min + i * binWidth).toFixed(1)}
                </text>
              )}
            </g>
          );
        })}

        {/* X and Y axes */}
        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={width - padRight}
          y2={padTop + plotH}
          stroke="#cbd5e1"
          strokeWidth="1.2"
        />
        <line
          x1={padLeft}
          y1={padTop}
          x2={padLeft}
          y2={padTop + plotH}
          stroke="#cbd5e1"
          strokeWidth="1.2"
        />
        <text
          x={width / 2}
          y={height - 1}
          fill="#475569"
          fontSize="9"
          fontWeight="500"
          textAnchor="middle"
        >
          {xLabel}
        </text>
      </svg>
    </div>
  );
};

interface BoxPlotGroup {
  name: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

export const BoxPlotChart: React.FC<{ groups: BoxPlotGroup[]; title?: string; yLabel?: string }> = ({
  groups,
  title = 'Box-and-Whisker Plot',
  yLabel = 'Measurement',
}) => {
  if (!groups || groups.length === 0) return null;

  const allVals = groups.flatMap((g) => [g.min, g.max, ...(g.outliers || [])]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  const width = 460;
  const height = 220;
  const padLeft = 46;
  const padBottom = 34;
  const padTop = 20;
  const padRight = 20;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const colW = plotW / groups.length;

  const scaleY = (val: number) => padTop + plotH * (1 - (val - min) / range);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">{title}</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Y-axis guidelines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const val = min + range * r;
          const y = scaleY(val);
          return (
            <g key={r}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padLeft - 6} y={y + 3} fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Group Boxes */}
        {groups.map((g, i) => {
          const cx = padLeft + i * colW + colW / 2;
          const boxW = Math.min(48, colW * 0.6);
          const yQ1 = scaleY(g.q1);
          const yQ3 = scaleY(g.q3);
          const yMed = scaleY(g.median);
          const yMin = scaleY(g.min);
          const yMax = scaleY(g.max);

          return (
            <g key={i}>
              {/* Whisker line */}
              <line x1={cx} y1={yMin} x2={cx} y2={yMax} stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" />
              {/* Min tick */}
              <line x1={cx - boxW / 4} y1={yMin} x2={cx + boxW / 4} y2={yMin} stroke="#475569" strokeWidth="1.5" />
              {/* Max tick */}
              <line x1={cx - boxW / 4} y1={yMax} x2={cx + boxW / 4} y2={yMax} stroke="#475569" strokeWidth="1.5" />

              {/* IQR Box */}
              <rect
                x={cx - boxW / 2}
                y={yQ3}
                width={boxW}
                height={Math.max(2, yQ1 - yQ3)}
                fill="#e0e7ff"
                stroke="#4f46e5"
                strokeWidth="1.5"
                rx="2"
              />

              {/* Median Line */}
              <line
                x1={cx - boxW / 2}
                y1={yMed}
                x2={cx + boxW / 2}
                y2={yMed}
                stroke="#1e1b4b"
                strokeWidth="2.5"
              />

              {/* Outliers */}
              {(g.outliers || []).map((outVal, oIdx) => (
                <circle
                  key={oIdx}
                  cx={cx}
                  cy={scaleY(outVal)}
                  r="3"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              ))}

              {/* Group label */}
              <text
                x={cx}
                y={height - 12}
                fill="#334155"
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
              >
                {g.name}
              </text>
            </g>
          );
        })}

        <line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#cbd5e1" strokeWidth="1.2" />
        <text
          x={padLeft - 26}
          y={padTop + plotH / 2}
          fill="#475569"
          fontSize="9"
          fontWeight="500"
          transform={`rotate(-90 ${padLeft - 26} ${padTop + plotH / 2})`}
          textAnchor="middle"
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
};

export const ScatterPlotChart: React.FC<{
  x: number[];
  y: number[];
  xLabel?: string;
  yLabel?: string;
  title?: string;
}> = ({ x, y, xLabel = 'X Variable', yLabel = 'Y Variable', title = 'Bivariate Scatter Plot & OLS Fit' }) => {
  const n = Math.min(x.length, y.length);
  if (n === 0) return null;

  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const width = 460;
  const height = 220;
  const padLeft = 44;
  const padBottom = 34;
  const padTop = 20;
  const padRight = 20;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const scaleX = (val: number) => padLeft + plotW * ((val - minX) / rangeX);
  const scaleY = (val: number) => padTop + plotH * (1 - (val - minY) / rangeY);

  // OLS slope
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - meanX) * (x[i] - meanX);
    sxy += (x[i] - meanX) * (y[i] - meanY);
  }
  const beta1 = sxx > 0 ? sxy / sxx : 0;
  const beta0 = meanY - beta1 * meanX;

  const fitY1 = beta0 + beta1 * minX;
  const fitY2 = beta0 + beta1 * maxX;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
        <span className="text-2xs font-mono text-indigo-600 font-semibold">
          y = {beta0.toFixed(2)} + {beta1.toFixed(2)}x
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Guidelines */}
        <line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#cbd5e1" strokeWidth="1.2" />

        {/* Linear regression line */}
        <line
          x1={scaleX(minX)}
          y1={scaleY(fitY1)}
          x2={scaleX(maxX)}
          y2={scaleY(fitY2)}
          stroke="#4f46e5"
          strokeWidth="2"
        />

        {/* Data points */}
        {x.map((xVal, i) => (
          <circle
            key={i}
            cx={scaleX(xVal)}
            cy={scaleY(y[i])}
            r="4"
            fill="#3b82f6"
            fillOpacity="0.7"
            stroke="#1d4ed8"
            strokeWidth="1"
            className="hover:r-5 transition-all"
          >
            <title>{`(${xVal}, ${y[i]})`}</title>
          </circle>
        ))}

        <text x={width / 2} y={height - 8} fill="#475569" fontSize="9" fontWeight="500" textAnchor="middle">
          {xLabel}
        </text>
        <text
          x={padLeft - 26}
          y={padTop + plotH / 2}
          fill="#475569"
          fontSize="9"
          fontWeight="500"
          transform={`rotate(-90 ${padLeft - 26} ${padTop + plotH / 2})`}
          textAnchor="middle"
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
};
