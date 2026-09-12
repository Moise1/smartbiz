import { useMemo, useRef, useState } from 'react';

// Single-series line chart of daily profile views. `data` is
// [{ day: 'YYYY-MM-DD', views: n }, …] — one row per day, zeros included.
const W = 640;
const H = 220;
const PAD = { top: 14, right: 14, bottom: 26, left: 40 };

function niceMax(v) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  // multiples whose halves are still whole numbers, so the mid gridline is an integer
  for (const m of [1, 2, 4, 10]) {
    if (m * pow >= v) return m * pow;
  }
  return 10 * pow;
}

function fmtDay(day) {
  return new Date(`${day}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export default function ViewsChart({ data = [] }) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const { points, maxY, ticks, linePath, areaPath, xLabelIdx } = useMemo(() => {
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const n = data.length;
    const maxY = niceMax(Math.max(0, ...data.map((d) => d.views)));
    const x = (i) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
    const y = (v) => PAD.top + innerH - (v / maxY) * innerH;
    const points = data.map((d, i) => ({ ...d, x: x(i), y: y(d.views) }));
    const linePath = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = points.length
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${y(0)} L${points[0].x.toFixed(1)},${y(0)} Z`
      : '';
    const ticks = [0, maxY / 2, maxY].map((v) => ({ v, y: y(v) }));
    // Four x labels: first, two evenly spaced, last
    const xLabelIdx = n > 3 ? [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1] : data.map((_, i) => i);
    return { points, maxY, ticks, linePath, areaPath, xLabelIdx };
  }, [data]);

  function handleMove(e) {
    if (!points.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - mx);
      if (d < best) { best = d; nearest = i; }
    });
    setHoverIdx(nearest);
  }

  if (!data.length) {
    return <p className="text-sm text-gray-400 py-8 text-center">No view data yet.</p>;
  }

  const hover = hoverIdx != null ? points[hoverIdx] : null;
  const last = points[points.length - 1];
  const noViews = maxY === 4 && data.every((d) => d.views === 0);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Daily profile views for the last ${data.length} days`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* recessive grid + y tick labels */}
        {ticks.map((t) => (
          <g key={t.v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD.left - 8} y={t.y + 3.5} textAnchor="end" fontSize="11" fill="#9ca3af" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {t.v}
            </text>
          </g>
        ))}

        {/* x labels */}
        {xLabelIdx.map((i) => (
          <text key={i} x={points[i].x} y={H - 8} textAnchor="middle" fontSize="11" fill="#9ca3af">
            {fmtDay(points[i].day)}
          </text>
        ))}

        {/* series */}
        <path d={areaPath} fill="#16a34a" opacity="0.08" />
        <path d={linePath} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* emphasized endpoint */}
        <circle cx={last.x} cy={last.y} r="3.5" fill="#16a34a" stroke="#ffffff" strokeWidth="2" />

        {/* hover crosshair */}
        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={PAD.top} y2={H - PAD.bottom} stroke="#d1d5db" strokeWidth="1" />
            <circle cx={hover.x} cy={hover.y} r="4" fill="#16a34a" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%`, marginTop: '-8px' }}
        >
          <span className="text-gray-300">{fmtDay(hover.day)} · </span>
          <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {hover.views} {hover.views === 1 ? 'view' : 'views'}
          </span>
        </div>
      )}

      {noViews && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none">
          No profile views yet — views appear as visitors open your business pages.
        </p>
      )}
    </div>
  );
}
