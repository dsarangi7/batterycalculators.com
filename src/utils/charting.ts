/**
 * Lightweight inline SVG charting utilities.
 * Pure TypeScript — zero external dependencies.
 * Renders into existing SVG elements via DOM manipulation.
 * Theme-aware: reads CSS custom properties for colors.
 */

export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ChartOptions {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  lineColor?: string;
  fillColor?: string;
  gridColor?: string;
  textColor?: string;
  showGrid?: boolean;
  showDots?: boolean;
  strokeWidth?: number;
  barWidth?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}

const NS = 'http://www.w3.org/2000/svg';
const PAD = { top: 14, right: 14, bottom: 28, left: 44 };

/* ─── Theme-aware color readers ─── */

function getThemeColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  } catch {
    return fallback;
  }
}

function chartBg(): string {
  return getThemeColor('--color-surface-soft', '#0d0d0d');
}

function chartGrid(): string {
  return getThemeColor('--color-hairline', '#3c3c3c');
}

function chartText(): string {
  return getThemeColor('--color-muted', '#7e7e7e');
}

/* ─── Helpers ─── */

function ce(tag: string): SVGElement {
  return document.createElementNS(NS, tag);
}

function sa(element: SVGElement, attrs: Record<string, string | number>): void {
  for (const k in attrs) element.setAttribute(k, String(attrs[k]));
}

function safe(v: number): number {
  return isFinite(v) && !isNaN(v) ? v : 0;
}

export function formatAxisValue(value: number): string {
  const v = safe(value);
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}

export function clearChart(svg: SVGElement): void {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

interface MergedChartOptions {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number | undefined;
  yMin: number;
  yMax: number | undefined;
  lineColor: string;
  fillColor: string;
  gridColor: string;
  textColor: string;
  showGrid: boolean;
  showDots: boolean;
  strokeWidth: number;
  barWidth: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

function mergeOpts(raw: Partial<ChartOptions> & { width: number; height: number; xLabel: string; yLabel: string }): MergedChartOptions {
  return {
    width: raw.width,
    height: raw.height,
    xLabel: raw.xLabel,
    yLabel: raw.yLabel,
    xMin: raw.xMin ?? 0,
    xMax: raw.xMax,
    yMin: raw.yMin ?? 0,
    yMax: raw.yMax,
    lineColor: raw.lineColor ?? '#0066b1',
    fillColor: raw.fillColor ?? 'rgba(0,102,177,0.12)',
    gridColor: raw.gridColor ?? chartGrid(),
    textColor: raw.textColor ?? chartText(),
    showGrid: raw.showGrid ?? true,
    showDots: raw.showDots ?? false,
    strokeWidth: raw.strokeWidth ?? 1.5,
    barWidth: raw.barWidth ?? 0.6,
    padding: raw.padding ?? PAD,
  };
}

function drawBg(svg: SVGElement, w: number, h: number): void {
  const r = ce('rect');
  sa(r, { x: 0, y: 0, width: w, height: h, fill: chartBg() });
  svg.appendChild(r);
}

function drawGrid(
  svg: SVGElement,
  o: MergedChartOptions,
  yMin: number,
  yMax: number,
  toY: (v: number) => number,
  xTicks: number[],
  toX?: (v: number) => number,
): void {
  if (!o.showGrid) return;
  const g = ce('g');
  const yR = yMax - yMin || 1;

  for (let i = 0; i <= 5; i++) {
    const yv = yMin + (yR * i) / 5;
    const line = ce('line');
    sa(line, {
      x1: o.padding.left, y1: toY(yv),
      x2: o.width - o.padding.right, y2: toY(yv),
      stroke: o.gridColor, 'stroke-width': 0.5, 'stroke-dasharray': '2,2',
    });
    g.appendChild(line);

    const txt = ce('text');
    sa(txt, {
      x: o.padding.left - 5, y: toY(yv) + 3,
      fill: o.textColor, 'font-size': '8', 'text-anchor': 'end',
      'font-family': 'Inter, sans-serif',
    });
    txt.textContent = formatAxisValue(yv);
    g.appendChild(txt);
  }

  if (toX) {
    for (const xv of xTicks) {
      const line = ce('line');
      sa(line, {
        x1: toX(xv), y1: o.padding.top,
        x2: toX(xv), y2: o.height - o.padding.bottom,
        stroke: o.gridColor, 'stroke-width': 0.5, 'stroke-dasharray': '2,2',
      });
      g.appendChild(line);

      const txt = ce('text');
      sa(txt, {
        x: toX(xv), y: o.height - o.padding.bottom + 13,
        fill: o.textColor, 'font-size': '8', 'text-anchor': 'middle',
        'font-family': 'Inter, sans-serif',
      });
      txt.textContent = formatAxisValue(xv);
      g.appendChild(txt);
    }
  }

  svg.appendChild(g);
}

function drawAxes(svg: SVGElement, o: MergedChartOptions): void {
  const xLine = ce('line');
  sa(xLine, {
    x1: o.padding.left, y1: o.height - o.padding.bottom,
    x2: o.width - o.padding.right, y2: o.height - o.padding.bottom,
    stroke: o.gridColor, 'stroke-width': 1,
  });
  svg.appendChild(xLine);

  const yLine = ce('line');
  sa(yLine, {
    x1: o.padding.left, y1: o.padding.top,
    x2: o.padding.left, y2: o.height - o.padding.bottom,
    stroke: o.gridColor, 'stroke-width': 1,
  });
  svg.appendChild(yLine);
}

function drawLabels(svg: SVGElement, o: MergedChartOptions): void {
  const pW = o.width - o.padding.left - o.padding.right;
  const pH = o.height - o.padding.top - o.padding.bottom;

  const xLabel = ce('text');
  sa(xLabel, {
    x: o.padding.left + pW / 2, y: o.height - 3,
    fill: o.textColor, 'font-size': '7', 'text-anchor': 'middle',
    'font-family': 'Inter, sans-serif', 'letter-spacing': '0.5',
  });
  xLabel.textContent = o.xLabel.toUpperCase();
  svg.appendChild(xLabel);

  const yLabel = ce('text');
  sa(yLabel, {
    x: 3, y: o.padding.top + pH / 2,
    fill: o.textColor, 'font-size': '7', 'text-anchor': 'middle',
    'font-family': 'Inter, sans-serif', 'letter-spacing': '0.5',
    transform: `rotate(-90, 3, ${o.padding.top + pH / 2})`,
  });
  yLabel.textContent = o.yLabel.toUpperCase();
  svg.appendChild(yLabel);
}

function drawEmpty(svg: SVGElement, o: MergedChartOptions): void {
  drawBg(svg, o.width, o.height);
  const txt = ce('text');
  sa(txt, {
    x: o.width / 2, y: o.height / 2,
    fill: o.textColor, 'font-size': '9', 'text-anchor': 'middle',
    'font-family': 'Inter, sans-serif',
  });
  txt.textContent = 'Enter values to see visualization';
  svg.appendChild(txt);
}

export function renderLineChart(
  svg: SVGElement,
  data: ChartDataPoint[],
  raw: { width: number; height: number; xLabel: string; yLabel: string } & Partial<ChartOptions>,
): void {
  clearChart(svg);
  const o = mergeOpts(raw);

  const valid = data.filter((d) => isFinite(d.x) && isFinite(d.y));
  if (valid.length === 0) {
    drawEmpty(svg, o);
    return;
  }

  const xMin = o.xMin ?? Math.min(...valid.map((d) => d.x));
  const xMax = o.xMax ?? Math.max(...valid.map((d) => d.x));
  const yMin = o.yMin ?? Math.min(0, Math.min(...valid.map((d) => d.y)));
  const yMax = o.yMax ?? Math.max(...valid.map((d) => d.y));
  const xR = xMax - xMin || 1;
  const yR = yMax - yMin || 1;
  const pW = o.width - o.padding.left - o.padding.right;
  const pH = o.height - o.padding.top - o.padding.bottom;

  const toX = (n: number) => o.padding.left + ((safe(n) - xMin) / xR) * pW;
  const toY = (n: number) => o.padding.top + pH - ((safe(n) - yMin) / yR) * pH;

  drawBg(svg, o.width, o.height);

  const xTicks: number[] = [];
  const rawXStep = xR / 5;
  const xMag = Math.pow(10, Math.floor(Math.log10(rawXStep)));
  const xNorm = rawXStep / xMag;
  const niceXStep = xNorm <= 1 ? xMag : xNorm <= 2 ? 2 * xMag : xNorm <= 5 ? 5 * xMag : 10 * xMag;
  const xStart = Math.ceil(xMin / niceXStep) * niceXStep;
  for (let t = xStart; t <= xMax; t += niceXStep) xTicks.push(Math.round(t * 1e6) / 1e6);
  drawGrid(svg, o, yMin, yMax, toY, xTicks, toX);
  drawAxes(svg, o);

  if (valid.length > 1) {
    let d = `M${toX(valid[0].x)},${toY(valid[0].y)}`;
    for (let i = 1; i < valid.length; i++) {
      d += ` L${toX(valid[i].x)},${toY(valid[i].y)}`;
    }

    const area = ce('path');
    sa(area, {
      d: d + ` L${toX(valid[valid.length - 1].x)},${toY(yMin)} L${toX(valid[0].x)},${toY(yMin)}Z`,
      fill: o.fillColor,
    });
    svg.appendChild(area);

    const line = ce('path');
    sa(line, {
      d, fill: 'none', stroke: o.lineColor,
      'stroke-width': o.strokeWidth, 'stroke-linejoin': 'round',
    });
    svg.appendChild(line);
  }

  if (o.showDots && valid.length <= 20) {
    const dotStroke = chartBg();
    for (const pt of valid) {
      const c = ce('circle');
      sa(c, {
        cx: toX(pt.x), cy: toY(pt.y), r: 2,
        fill: o.lineColor, stroke: dotStroke, 'stroke-width': 0.5,
      });
      svg.appendChild(c);
    }
  }

  drawLabels(svg, o);
}

export function renderBarChart(
  svg: SVGElement,
  data: ChartDataPoint[],
  raw: { width: number; height: number; xLabel: string; yLabel: string } & Partial<ChartOptions>,
): void {
  clearChart(svg);
  const o = mergeOpts(raw);

  const valid = data.filter((d) => isFinite(d.x) && isFinite(d.y));
  if (valid.length === 0) {
    drawEmpty(svg, o);
    return;
  }

  const yMin = 0;
  const yMax = o.yMax ?? (Math.max(...valid.map((d) => d.y)) * 1.1 || 1);
  const yR = yMax - yMin || 1;
  const pW = o.width - o.padding.left - o.padding.right;
  const pH = o.height - o.padding.top - o.padding.bottom;

  const toY = (n: number) => o.padding.top + pH - ((safe(n) - yMin) / yR) * pH;

  drawBg(svg, o.width, o.height);
  drawGrid(svg, o, yMin, yMax, toY, []);
  drawAxes(svg, o);

  const slot = pW / valid.length;
  const barW = slot * o.barWidth;
  const gap = slot - barW;

  for (let i = 0; i < valid.length; i++) {
    const pt = valid[i];
    const barH = ((safe(pt.y) - yMin) / yR) * pH;
    const x = o.padding.left + i * slot + gap / 2;
    const y = o.padding.top + pH - barH;

    const rect = ce('rect');
    sa(rect, {
      x, y: Math.max(o.padding.top, y),
      width: barW, height: Math.max(0, barH),
      fill: o.fillColor, stroke: o.lineColor, 'stroke-width': 0.5,
    });
    svg.appendChild(rect);

    const valTxt = ce('text');
    sa(valTxt, {
      x: x + barW / 2, y: Math.max(o.padding.top + 8, y - 3),
      fill: o.textColor, 'font-size': '7', 'text-anchor': 'middle',
      'font-family': 'Inter, sans-serif',
    });
    valTxt.textContent = formatAxisValue(pt.y);
    svg.appendChild(valTxt);

    const xTxt = ce('text');
    sa(xTxt, {
      x: x + barW / 2, y: o.height - o.padding.bottom + 12,
      fill: o.textColor, 'font-size': '8', 'text-anchor': 'middle',
      'font-family': 'Inter, sans-serif',
    });
    xTxt.textContent = pt.label ?? formatAxisValue(pt.x);
    svg.appendChild(xTxt);
  }

  drawLabels(svg, o);
}
