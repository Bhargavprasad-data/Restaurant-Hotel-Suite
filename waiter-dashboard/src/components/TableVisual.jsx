import React from 'react';

/**
 * TableVisual – SVG top-down view of a restaurant table with chairs arranged
 * around it based on seating capacity. Color adapts to table status.
 *
 * Props:
 *   capacity  – number of seats (2 | 4 | 6 | 8 | 10)
 *   color     – accent color string (CSS color)
 *   size      – overall SVG size in px (default 80)
 */
const TableVisual = ({ capacity = 4, color = '#22c55e', size = 80 }) => {
  const cx = size / 2;
  const cy = size / 2;

  // Table ellipse radii
  const tw = size * 0.22; // half-width
  const th = size * 0.155; // half-height

  // Chair dimensions
  const cw = size * 0.115;  // chair width
  const ch = size * 0.075;  // chair height
  const cr = size * 0.03;   // corner radius of chair
  const gap = size * 0.045; // gap between table edge and chair

  // Generate chair positions around the table for given capacity
  const chairs = getChairPositions(capacity, cx, cy, tw, th, cw, ch, gap, size);

  const tableColor = color;
  const chairColor = color;
  const tableFill = `${color}18`;  // very subtle fill
  const chairFill = `${color}28`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Chairs (drawn behind table) */}
      {chairs.map((c, i) => (
        <g key={i} transform={`translate(${c.x},${c.y}) rotate(${c.angle})`}>
          {/* Chair back */}
          <rect
            x={-cw / 2}
            y={-ch / 2}
            width={cw}
            height={ch * 0.35}
            rx={cr * 0.8}
            fill={chairFill}
            stroke={chairColor}
            strokeWidth={size * 0.018}
            strokeLinejoin="round"
          />
          {/* Chair seat */}
          <rect
            x={-cw / 2 + cw * 0.07}
            y={-ch / 2 + ch * 0.42}
            width={cw * 0.86}
            height={ch * 0.52}
            rx={cr * 0.6}
            fill={chairFill}
            stroke={chairColor}
            strokeWidth={size * 0.018}
            strokeLinejoin="round"
          />
          {/* Left leg */}
          <line
            x1={-cw / 2 + cw * 0.15}
            y1={ch / 2 - ch * 0.04}
            x2={-cw / 2 + cw * 0.1}
            y2={ch / 2 + ch * 0.22}
            stroke={chairColor}
            strokeWidth={size * 0.016}
            strokeLinecap="round"
          />
          {/* Right leg */}
          <line
            x1={cw / 2 - cw * 0.15}
            y1={ch / 2 - ch * 0.04}
            x2={cw / 2 - cw * 0.1}
            y2={ch / 2 + ch * 0.22}
            stroke={chairColor}
            strokeWidth={size * 0.016}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Table top (ellipse) */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={tw}
        ry={th}
        fill={tableFill}
        stroke={tableColor}
        strokeWidth={size * 0.025}
      />

      {/* Subtle table grain lines */}
      <line
        x1={cx - tw * 0.55}
        y1={cy}
        x2={cx + tw * 0.55}
        y2={cy}
        stroke={tableColor}
        strokeWidth={size * 0.012}
        strokeOpacity={0.35}
        strokeLinecap="round"
      />
      <line
        x1={cx - tw * 0.3}
        y1={cy - th * 0.45}
        x2={cx - tw * 0.3}
        y2={cy + th * 0.45}
        stroke={tableColor}
        strokeWidth={size * 0.01}
        strokeOpacity={0.2}
        strokeLinecap="round"
      />
      <line
        x1={cx + tw * 0.3}
        y1={cy - th * 0.45}
        x2={cx + tw * 0.3}
        y2={cy + th * 0.45}
        stroke={tableColor}
        strokeWidth={size * 0.01}
        strokeOpacity={0.2}
        strokeLinecap="round"
      />

      {/* Table legs (two small circles at bottom of ellipse) */}
      <circle cx={cx - tw * 0.45} cy={cy + th + size * 0.03} r={size * 0.025} fill={tableColor} opacity={0.45} />
      <circle cx={cx + tw * 0.45} cy={cy + th + size * 0.03} r={size * 0.025} fill={tableColor} opacity={0.45} />
    </svg>
  );
};

/**
 * Calculates chair positions arranged naturally around the table.
 * Layout strategy:
 *   2  → 1 top, 1 bottom
 *   4  → 1 top, 1 bottom, 1 left, 1 right
 *   6  → 2 top, 2 bottom, 1 left, 1 right
 *   8  → 2 top, 2 bottom, 2 left, 2 right
 *   10 → 3 top, 3 bottom, 2 left, 2 right
 */
function getChairPositions(capacity, cx, cy, tw, th, cw, ch, gap, size) {
  const chairs = [];

  const layouts = {
    2:  { top: 1, bottom: 1, left: 0, right: 0 },
    4:  { top: 1, bottom: 1, left: 1, right: 1 },
    6:  { top: 2, bottom: 2, left: 1, right: 1 },
    8:  { top: 2, bottom: 2, left: 2, right: 2 },
    10: { top: 3, bottom: 3, left: 2, right: 2 },
  };

  const layout = layouts[capacity] || layouts[4];

  const addRow = (count, side) => {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
      let x, y, angle;

      if (side === 'top') {
        x = cx + t * tw * 1.1;
        y = cy - th - gap - ch / 2;
        angle = 0;
      } else if (side === 'bottom') {
        x = cx + t * tw * 1.1;
        y = cy + th + gap + ch / 2;
        angle = 180;
      } else if (side === 'left') {
        x = cx - tw - gap - ch / 2;
        y = cy + t * th * 1.2;
        angle = -90;
      } else { // right
        x = cx + tw + gap + ch / 2;
        y = cy + t * th * 1.2;
        angle = 90;
      }

      chairs.push({ x, y, angle });
    }
  };

  addRow(layout.top, 'top');
  addRow(layout.bottom, 'bottom');
  addRow(layout.left, 'left');
  addRow(layout.right, 'right');

  return chairs;
}

export default TableVisual;
