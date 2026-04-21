import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line,
  ScatterChart, Scatter, ZAxis, Cell,
  PieChart, Pie
} from 'recharts';

// ============================================================
// CONFIG
// ============================================================
const SHEET_ID = '1hF1Z-3LLgzzzFwc66xVqEXszNm3qSH8Xwl6DT01dQRs';
const API_KEY = 'AIzaSyAs_UERCv_a4ZCfrZI2XvThGMFPFRkStO0';

// ============================================================
// DESIGN TOKENS
// ============================================================
const T = {
  // Warm editorial palette - sophisticated, data-forward
  bg: '#faf9f7',
  surface: '#ffffff',
  inkDark: '#0c0a09',
  ink: '#1c1917',
  muted: '#57534e',
  faint: '#a8a29e',
  line: '#e7e5e4',
  lineSoft: '#f5f5f4',
  accent: '#b91c1c',      // brand red
  positive: '#166534',    // muted green
  negative: '#b91c1c',    // red
  // Region palette (muted, editorial)
  region: {
    '東アジア':   '#1c1917',
    '東南アジア': '#b91c1c',
    '欧米豪':     '#44403c',
    'その他':     '#a8a29e',
  },
  // Expense category palette (distinct hues, muted saturation)
  expense: {
    accommodation: '#0f766e',  // deep teal — water/rest
    food:          '#9a3412',  // burnt orange — warmth of food
    transport:     '#166534',  // forest green — movement/nature
    entertainment: '#7e22ce',  // deep violet — culture/leisure
    shopping:      '#b91c1c',  // brand red — commerce
    other:         '#78716c',  // neutral stone
  },
  sans: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
};

// ============================================================
// CONSTANTS
// ============================================================
const REGION_GROUPS = {
  '東アジア':   ['韓国', '台湾', '香港', '中国'],
  '東南アジア': ['タイ', 'シンガポール', 'マレーシア', 'インドネシア', 'フィリピン', 'ベトナム'],
  '欧米豪':     ['米国', 'カナダ', 'メキシコ', '英国', 'ドイツ', 'フランス', 'イタリア', 'スペイン', 'オーストラリア', 'ロシア', '北欧'],
  'その他':     ['インド', '中東', 'その他'],
};

const COUNTRY_FLAGS = {
  '韓国': '🇰🇷', '台湾': '🇹🇼', '香港': '🇭🇰', '中国': '🇨🇳',
  'タイ': '🇹🇭', 'シンガポール': '🇸🇬', 'マレーシア': '🇲🇾', 'インドネシア': '🇮🇩',
  'フィリピン': '🇵🇭', 'ベトナム': '🇻🇳', '米国': '🇺🇸', 'カナダ': '🇨🇦',
  'メキシコ': '🇲🇽', '英国': '🇬🇧', 'ドイツ': '🇩🇪', 'フランス': '🇫🇷',
  'イタリア': '🇮🇹', 'スペイン': '🇪🇸', 'オーストラリア': '🇦🇺', 'ロシア': '🇷🇺',
  'インド': '🇮🇳', '北欧': '🇸🇪', '中東': '🇦🇪', 'その他': '—',
};

// ============================================================
// PERIOD MODEL
// ============================================================
const PERIODS = [
  { key: '2026Q1', label: "2026 Q1", type: 'quarter', year: '2026', q: '1', badge: '1次速報' },
  { key: '2025',   label: '2025',    type: 'year',    year: '2025',            badge: '年間' },
  { key: '2024',   label: '2024',    type: 'year',    year: '2024',            badge: '年間' },
  { key: '2023',   label: '2023',    type: 'year',    year: '2023',            badge: '年間' },
];

const resolveSheets = (period) => {
  const p = PERIODS.find(x => x.key === period);
  if (!p) return null;

  if (p.type === 'quarter') {
    const prevYear = String(parseInt(p.year) - 1);
    return {
      period: p,
      expense: `${p.year}_Q${p.q}_図表3`,
      visitor: `${p.year}_Q${p.q}_図表4`,
      prevExpense: `${prevYear}_Q${p.q}_図表3`,
      prevVisitor: `${prevYear}_Q${p.q}_図表4`,
      periodLabel: `${p.year}年 1-3月期`,
      prevLabel: `${prevYear}年 同期`,
      unit: '億円（四半期）',
    };
  }
  const prev = String(parseInt(p.year) - 1);
  return {
    period: p,
    expense: `${p.year}_年間_図表3`,
    visitor: `${p.year}_年間_図表4`,
    prevExpense: `${prev}_年間_図表3`,
    prevVisitor: `${prev}_年間_図表4`,
    periodLabel: `${p.year}年 年間`,
    prevLabel: `${prev}年 年間`,
    unit: '億円（年間）',
  };
};

// ============================================================
// TREND DATA (quarterly, hardcoded)
// ※ 新しい四半期発表時はここに1行追加
// ============================================================
const TREND_DATA = [
  { label: '23/Q1', total: 10103, perPerson: 21.1 },
  { label: '23/Q2', total: 12319, perPerson: 20.9 },
  { label: '23/Q3', total: 13801, perPerson: 20.9 },
  { label: '23/Q4', total: 16831, perPerson: 22.0 },
  { label: '24/Q1', total: 17700, perPerson: 21.1 },
  { label: '24/Q2', total: 21402, perPerson: 23.9 },
  { label: '24/Q3', total: 19186, perPerson: 22.0 },
  { label: '24/Q4', total: 22969, perPerson: 23.6 },
  { label: '25/Q1', total: 22803, perPerson: 22.3 },
  { label: '25/Q2', total: 25043, perPerson: 23.7 },
  { label: '25/Q3', total: 21384, perPerson: 22.0 },
  { label: '25/Q4', total: 25319, perPerson: 23.4 },
  { label: '26/Q1', total: 23378, perPerson: 22.1 }, // ← 2026 Q1 (1次速報)
];

// ============================================================
// UTILS
// ============================================================
const parseNumber = (str) => {
  if (str === null || str === undefined) return 0;
  const cleaned = String(str).replace(/,/g, '').replace(/[円泊人%]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatNum = (n, dec = 0) => {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('ja-JP', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
};

const formatOku = (n, dec = 0) => {
  // Format as 億円 (assumes input already in 億円)
  if (n == null || isNaN(n)) return '—';
  if (n >= 10000) return `${(n / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 2 })}兆`;
  return formatNum(n, dec);
};

const pctChange = (cur, prev) => {
  if (!prev || prev === 0) return null;
  const v = ((cur - prev) / prev) * 100;
  return { value: v, positive: v >= 0 };
};

const getRegion = (country) => {
  for (const [r, arr] of Object.entries(REGION_GROUPS)) {
    if (arr.includes(country)) return r;
  }
  return 'その他';
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// DATA FETCHING
// ============================================================
const fetchSheet = async (sheetName, retries = 2) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (res.status === 429 && retries > 0) {
      await delay(1000);
      return fetchSheet(sheetName, retries - 1);
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data.values || [];
  } catch (e) {
    console.warn(`fetchSheet failed: ${sheetName}`, e);
    return [];
  }
};

const parseExpense = (rows) => {
  if (!rows || rows.length < 5) return [];
  return rows.slice(4).map(r => ({
    country: r[0] || '',
    total: parseNumber(r[1]),
    accommodation: parseNumber(r[2]),
    food: parseNumber(r[3]),
    transport: parseNumber(r[4]),
    entertainment: parseNumber(r[5]),
    shopping: parseNumber(r[6]),
    other: parseNumber(r[7]),
  })).filter(d => d.country);
};

const parseVisitor = (rows) => {
  if (!rows || rows.length < 5) return [];
  return rows.slice(4).map(r => ({
    country: r[0] || '',
    perPerson: parseNumber(r[1]),
    visitors: parseNumber(r[2]),
    totalSpend: parseNumber(r[3]),
    avgNights: parseNumber(r[4]),
  })).filter(d => d.country);
};

const mergeData = (expense, visitor) => {
  return expense.map(e => {
    const v = visitor.find(x => x.country === e.country) || {};
    return { ...e, ...v };
  });
};

// ============================================================
// iframe HEIGHT (ResizeObserver on root ref, debounced for stability)
// ============================================================
const useIframeHeight = (rootRef, ...deps) => {
  useEffect(() => {
    let raf;
    let debounceTimer;
    let lastH = 0;

    const measure = () => {
      const el = rootRef.current;
      if (!el) return 0;
      return Math.ceil(el.getBoundingClientRect().height);
    };

    const broadcast = () => {
      const h = measure();
      if (h > 0 && Math.abs(h - lastH) > 4) {
        lastH = h;
        window.parent.postMessage({ type: 'setHeight', source: 'spending-dashboard', height: h }, '*');
      }
    };

    // Debounced send: wait 80ms for Recharts resize cascades to settle
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        raf = requestAnimationFrame(broadcast);
      }, 80);
    };

    const el = rootRef.current;
    if (!el) return;

    const ro = new ResizeObserver(schedule);
    ro.observe(el);

    const onMsg = (e) => { if (e.data?.type === 'requestHeight') broadcast(); };
    window.addEventListener('message', onMsg);
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);

    // Initial broadcast (not debounced)
    broadcast();

    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(debounceTimer);
      window.removeEventListener('message', onMsg);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit re-broadcast on tab/period/expanded changes
  useEffect(() => {
    const timers = [100, 400, 900].map(ms => setTimeout(() => {
      const el = rootRef.current;
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) {
        window.parent.postMessage({ type: 'setHeight', source: 'spending-dashboard', height: h }, '*');
      }
    }, ms));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

// ============================================================
// ATOMIC UI COMPONENTS
// ============================================================

// Delta pill - compact growth indicator
const Delta = ({ change, size = 'md' }) => {
  if (!change) return <span style={{ color: T.faint, fontSize: 12 }}>—</span>;
  const color = change.positive ? T.positive : T.negative;
  const sign = change.positive ? '+' : '';
  const fs = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
  return (
    <span style={{
      color,
      fontSize: fs,
      fontWeight: 600,
      fontFamily: T.mono,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.01em',
    }}>
      {sign}{change.value.toFixed(1)}%
    </span>
  );
};

// Big number (editorial display)
const BigNum = ({ value, unit, size = 'xl' }) => {
  const sizes = {
    md: { num: 22, unit: 12 },
    lg: { num: 32, unit: 14 },
    xl: { num: 44, unit: 16 },
    xxl: { num: 56, unit: 18 },
  };
  const s = sizes[size];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{
        fontFamily: T.sans,
        fontSize: s.num,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>{value}</span>
      {unit && <span style={{
        fontSize: s.unit,
        fontWeight: 500,
        color: 'inherit',
        opacity: 0.65,
        marginLeft: 2,
      }}>{unit}</span>}
    </span>
  );
};

// Horizontal bar (for rankings)
const HBar = ({ value, max, color = T.inkDark, height = 4 }) => {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{
      height,
      backgroundColor: T.lineSoft,
      borderRadius: height / 2,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        backgroundColor: color,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
};

// Section header (editorial)
const SectionTitle = ({ title, subtitle, kicker, aside }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 14,
    marginBottom: 20,
    borderBottom: `1px solid ${T.line}`,
    gap: 16,
    flexWrap: 'wrap',
  }}>
    <div>
      {kicker && <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: T.accent,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 6,
      }}>{kicker}</div>}
      <h2 style={{
        fontFamily: T.sans,
        fontSize: 22,
        fontWeight: 700,
        color: T.inkDark,
        margin: 0,
        letterSpacing: '-0.01em',
      }}>{title}</h2>
      {subtitle && <p style={{
        fontSize: 13,
        color: T.muted,
        margin: '4px 0 0',
      }}>{subtitle}</p>}
    </div>
    {aside && <div>{aside}</div>}
  </div>
);

// Card wrapper
const Card = ({ children, style }) => (
  <div style={{
    backgroundColor: T.surface,
    border: `1px solid ${T.line}`,
    borderRadius: 4,
    padding: 24,
    ...style,
  }}>{children}</div>
);

// ============================================================
// HERO STRIP - Top-level period + KPI summary (always visible)
// ============================================================
const HeroStrip = ({ sheets, kpi, loading }) => {
  if (!sheets) return null;
  const { period, periodLabel, prevLabel } = sheets;
  return (
    <div style={heroStyles.wrap}>
      <div style={heroStyles.inner} className="hero-inner">
        {/* LEFT: period marker */}
        <div style={heroStyles.left}>
          <div style={heroStyles.kicker}>訪日外国人消費動向</div>
          <div style={heroStyles.periodRow}>
            <span style={heroStyles.periodMain}>{periodLabel}</span>
            <span style={heroStyles.periodBadge}>{period.badge}</span>
          </div>
          <div style={heroStyles.sub}>vs {prevLabel}　|　出典：観光庁</div>
        </div>

        {/* RIGHT: 4 KPI cells */}
        <div style={heroStyles.kpiGrid} className="hero-kpi-grid">
          <KpiCell label="総消費額" value={loading || !kpi ? '—' : formatOku(kpi.total, 0)} unit="億円" change={kpi?.totalChg} loading={loading} />
          <KpiCell label="訪日客数" value={loading || !kpi ? '—' : formatNum(kpi.visitors, 1)} unit="万人" change={kpi?.visitorsChg} loading={loading} />
          <KpiCell label="客単価" value={loading || !kpi ? '—' : formatNum(kpi.perPerson, 1)} unit="万円" change={kpi?.perPersonChg} loading={loading} />
          <KpiCell label="買物比率" value={loading || !kpi ? '—' : formatNum(kpi.shopRatio, 1)} unit="%" change={kpi?.shopRatioChg} loading={loading} />
        </div>
      </div>
    </div>
  );
};

const KpiCell = ({ label, value, unit, change, loading }) => (
  <div style={heroStyles.kpiCell}>
    <div style={heroStyles.kpiLabel}>{label}</div>
    <div style={heroStyles.kpiValue}>
      {loading ? <span style={{ color: T.faint }}>—</span> : <BigNum value={value} unit={unit} size="lg" />}
    </div>
    <div style={heroStyles.kpiDelta}>
      {change && <Delta change={change} size="sm" />}
      <span style={heroStyles.kpiDeltaLabel}>前期比</span>
    </div>
  </div>
);

const heroStyles = {
  wrap: {
    backgroundColor: T.inkDark,
    color: '#fff',
  },
  inner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '40px 24px 36px',
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 1fr) 2.5fr',
    gap: 40,
    alignItems: 'center',
  },
  left: {},
  kicker: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    opacity: 0.55,
    marginBottom: 12,
  },
  periodRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    flexWrap: 'wrap',
  },
  periodMain: {
    fontFamily: T.sans,
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  periodBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '4px 8px',
    backgroundColor: T.accent,
    color: '#fff',
    borderRadius: 2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  sub: {
    fontSize: 12,
    opacity: 0.55,
    marginTop: 10,
    letterSpacing: '0.02em',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 0,
  },
  kpiCell: {
    padding: '0 20px',
    borderLeft: '1px solid rgba(255,255,255,0.15)',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 500,
    opacity: 0.6,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  kpiValue: {
    marginBottom: 8,
    color: '#fff',
  },
  kpiDelta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  kpiDeltaLabel: {
    fontSize: 10,
    opacity: 0.5,
    letterSpacing: '0.05em',
  },
};

// ============================================================
// STICKY NAV - Period selector + tabs
// ============================================================
const StickyNav = ({ period, setPeriod, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'overview',    label: '概観' },
    { id: 'countries',   label: '国別' },
    { id: 'composition', label: '構成' },
    { id: 'analysis',    label: '分析' },
  ];
  return (
    <div style={navStyles.wrap}>
      <div style={navStyles.inner} className="nav-inner">
        <div style={navStyles.periods} className="nav-periods">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                ...navStyles.periodBtn,
                ...(period === p.key ? navStyles.periodBtnActive : {}),
              }}
            >
              <span style={navStyles.periodBtnLabel}>{p.label}</span>
              {p.type === 'quarter' && (
                <span style={{
                  ...navStyles.periodBtnBadge,
                  backgroundColor: period === p.key ? T.accent : 'transparent',
                  color: period === p.key ? '#fff' : T.accent,
                  border: `1px solid ${T.accent}`,
                }}>Q</span>
              )}
            </button>
          ))}
        </div>
        <div style={navStyles.tabs} className="nav-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                ...navStyles.tab,
                ...(activeTab === t.id ? navStyles.tabActive : {}),
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

const navStyles = {
  wrap: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backgroundColor: T.bg,
    borderBottom: `1px solid ${T.line}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  inner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  periods: {
    display: 'flex',
    gap: 4,
    padding: 3,
    backgroundColor: '#fff',
    border: `1px solid ${T.line}`,
    borderRadius: 4,
  },
  periodBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: T.muted,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: T.sans,
  },
  periodBtnActive: {
    backgroundColor: T.inkDark,
    color: '#fff',
  },
  periodBtnLabel: {
    fontVariantNumeric: 'tabular-nums',
  },
  periodBtnBadge: {
    fontSize: 9,
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 2,
    letterSpacing: '0.06em',
  },
  tabs: {
    display: 'flex',
    gap: 2,
  },
  tab: {
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 500,
    color: T.muted,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: T.sans,
  },
  tabActive: {
    color: T.inkDark,
    fontWeight: 700,
    borderBottomColor: T.accent,
  },
};

// ============================================================
// TAB 1: 概観 (Overview) - Big picture, 1-screen summary
// ============================================================
// Country color palette for pie chart - editorial tone, region-based hues
const COUNTRY_COLORS = {
  // 東アジア (dark warm grays)
  '中国':   '#1c1917',
  '韓国':   '#57534e',
  '台湾':   '#78716c',
  '香港':   '#a8a29e',
  // 欧米豪 (blues/purples)
  '米国':          '#1e3a8a',
  'オーストラリア': '#2563eb',
  'カナダ':        '#60a5fa',
  '英国':          '#312e81',
  'ドイツ':        '#4338ca',
  'フランス':      '#6366f1',
  'イタリア':      '#818cf8',
  'スペイン':      '#a5b4fc',
  'ロシア':        '#7c3aed',
  'メキシコ':      '#3b82f6',
  // 東南アジア (warm reds)
  'タイ':         '#b91c1c',
  'シンガポール': '#dc2626',
  'マレーシア':   '#ef4444',
  'インドネシア': '#f87171',
  'フィリピン':   '#fca5a5',
  'ベトナム':     '#991b1b',
  // その他 (earth tones)
  'インド':       '#92400e',
  '中東':         '#a16207',
  '北欧':         '#854d0e',
  'その他':       '#d6d3d1',
};
const colorOf = (c) => COUNTRY_COLORS[c] || '#a8a29e';

// Consumption Pie — PDF-style donut with top-N labels
const ConsumptionDonut = ({ data, label, totalLabel, topN = 8 }) => {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    const filtered = data
      .filter(d => d.country !== '全国籍・地域' && d.total > 0)
      .sort((a, b) => b.total - a.total);
    const top = filtered.slice(0, topN);
    const rest = filtered.slice(topN);
    const restSum = rest.reduce((s, d) => s + d.total, 0);
    const result = top.map(d => ({ name: d.country, value: d.total, color: colorOf(d.country) }));
    if (restSum > 0) {
      result.push({ name: 'その他', value: restSum, color: colorOf('その他') });
    }
    return result;
  }, [data, topN]);

  const total = useMemo(() => chartData.reduce((s, d) => s + d.value, 0), [chartData]);

  if (!chartData.length) return null;

  // External label renderer - PDF style
  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent, index }) => {
    const show = percent >= 0.03; // hide labels for <3%
    if (!show) return null;
    const RADIAN = Math.PI / 180;
    const lineStart = outerRadius + 2;
    const lineEnd = outerRadius + 16;
    const textOffset = outerRadius + 22;
    const cos = Math.cos(-midAngle * RADIAN);
    const sin = Math.sin(-midAngle * RADIAN);
    const x1 = cx + lineStart * cos;
    const y1 = cy + lineStart * sin;
    const x2 = cx + lineEnd * cos;
    const y2 = cy + lineEnd * sin;
    const tx = cx + textOffset * cos;
    const ty = cy + textOffset * sin;
    const anchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.faint} strokeWidth={1} />
        <text x={tx} y={ty - 4} textAnchor={anchor} style={{ fontSize: 10, fontWeight: 700, fill: T.ink, fontFamily: T.sans }}>
          {name}
        </text>
        <text x={tx} y={ty + 8} textAnchor={anchor} style={{ fontSize: 9, fill: T.muted, fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' }}>
          {formatOku(value)}億 · {(percent * 100).toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ position: 'relative', width: '100%', height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 40, right: 90, bottom: 40, left: 90 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={1}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
              isAnimationActive={false}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.08em' }}>
            総消費額
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: T.inkDark,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            marginTop: 2,
          }}>
            {formatOku(total)}
          </div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>億円</div>
        </div>
      </div>
      {totalLabel && (
        <div style={{
          fontSize: 11,
          color: T.muted,
          marginTop: 4,
          fontFamily: T.mono,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {totalLabel}
        </div>
      )}
    </div>
  );
};

const ConsumptionPieSection = ({ data, prev, sheets }) => {
  const periodLabel = sheets?.periodLabel || '';
  const prevLabel = useMemo(() => {
    if (!sheets?.period) return '';
    if (sheets.period.type === 'quarter') {
      return `${parseInt(sheets.period.year) - 1} Q${sheets.period.q}`;
    }
    return `${parseInt(sheets.period.year) - 1}`;
  }, [sheets]);

  const totalCurrent = useMemo(() => {
    const t = data?.find(d => d.country === '全国籍・地域');
    return t?.total || 0;
  }, [data]);
  const totalPrev = useMemo(() => {
    const t = prev?.find(d => d.country === '全国籍・地域');
    return t?.total || 0;
  }, [prev]);
  const chgPct = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev) * 100 : 0;

  return (
    <Card>
      <SectionTitle
        kicker="Country Breakdown"
        title="国別 消費額構成"
        subtitle={`${periodLabel} 対 ${prevLabel} 同期比較`}
        aside={
          totalPrev > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                前年同期比
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: chgPct >= 0 ? T.positive : T.negative,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                marginTop: 2,
              }}>
                {chgPct >= 0 ? '+' : ''}{chgPct.toFixed(1)}%
              </div>
            </div>
          )
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="pie-grid">
        <ConsumptionDonut data={data} label={periodLabel} />
        <ConsumptionDonut data={prev} label={prevLabel} />
      </div>
    </Card>
  );
};

const OverviewTab = ({ data, prev, sheets }) => {
  const top10 = useMemo(() => {
    if (!data?.length) return [];
    return data
      .filter(d => d.country !== '全国籍・地域' && d.country !== 'その他' && d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [data]);

  const regional = useMemo(() => {
    if (!data?.length) return [];
    const total = data[0]?.total || 0;
    return Object.entries(REGION_GROUPS).map(([region, countries]) => {
      const sum = data.filter(d => countries.includes(d.country)).reduce((s, d) => s + (d.total || 0), 0);
      return { region, total: sum, share: total ? (sum / total) * 100 : 0 };
    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }, [data]);

  const movers = useMemo(() => {
    if (!data?.length || !prev?.length) return { gainers: [], losers: [] };
    const prevMap = {};
    prev.forEach(p => { prevMap[p.country] = p; });
    const withGrowth = data
      .filter(d => d.country !== '全国籍・地域' && d.country !== 'その他' && d.total > 50)
      .map(d => ({
        country: d.country,
        total: d.total,
        growth: prevMap[d.country]?.total ? ((d.total - prevMap[d.country].total) / prevMap[d.country].total) * 100 : null,
      }))
      .filter(d => d.growth !== null);
    return {
      gainers: [...withGrowth].sort((a, b) => b.growth - a.growth).slice(0, 4),
      losers: [...withGrowth].sort((a, b) => a.growth - b.growth).slice(0, 4),
    };
  }, [data, prev]);

  const maxTotal = top10[0]?.total || 1;
  const maxRegion = regional[0]?.total || 1;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* TREND CHART - Full width */}
      <Card>
        <SectionTitle
          kicker="Quarterly Trend"
          title="四半期別 推移"
          subtitle="2023年 1-3月期 〜 最新四半期"
        />
        <TrendChart data={TREND_DATA} highlightLabel={sheets?.period.type === 'quarter' ? '26/Q1' : null} />
      </Card>

      {/* COUNTRY BREAKDOWN PIE - current vs prev year */}
      <ConsumptionPieSection data={data} prev={prev} sheets={sheets} />

      {/* TOP COUNTRIES (left) + REGIONAL (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }} className="two-col">
        <Card>
          <SectionTitle
            kicker="Ranking"
            title="国別 TOP 10"
            subtitle={`${sheets?.periodLabel} 消費額上位`}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {top10.map((c, i) => {
              const region = getRegion(c.country);
              return (
                <div key={c.country} style={ovStyles.rankRow} className="rank-row">
                  <div style={ovStyles.rankNum}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={ovStyles.rankCountry}>
                    <span style={ovStyles.rankFlag}>{COUNTRY_FLAGS[c.country]}</span>
                    <span>{c.country}</span>
                  </div>
                  <div style={ovStyles.rankBarWrap}>
                    <HBar value={c.total} max={maxTotal} color={T.region[region]} height={6} />
                  </div>
                  <div style={ovStyles.rankValue}>
                    <BigNum value={formatOku(c.total)} unit="億" size="md" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle
            kicker="By Region"
            title="地域構成"
            subtitle="消費額シェア"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {regional.map(r => (
              <div key={r.region}>
                <div style={ovStyles.regRow}>
                  <span style={ovStyles.regName}>
                    <span style={{
                      display: 'inline-block', width: 3, height: 14,
                      backgroundColor: T.region[r.region],
                      marginRight: 10, verticalAlign: 'middle',
                    }} />
                    {r.region}
                  </span>
                  <span style={ovStyles.regValue}>
                    {formatOku(r.total)}<span style={{ fontSize: 11, color: T.faint, marginLeft: 4 }}>億</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <div style={{ flex: 1 }}>
                    <HBar value={r.total} max={maxRegion} color={T.region[r.region]} height={4} />
                  </div>
                  <span style={{
                    fontSize: 11, color: T.muted, minWidth: 40, textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{r.share.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* MOVERS - gainers + losers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="two-col">
        <Card style={{ borderLeft: `3px solid ${T.positive}` }}>
          <SectionTitle kicker="Gainers" title="伸びた市場" />
          <MoverList items={movers.gainers} />
        </Card>
        <Card style={{ borderLeft: `3px solid ${T.negative}` }}>
          <SectionTitle kicker="Decliners" title="減った市場" />
          <MoverList items={movers.losers} />
        </Card>
      </div>
    </div>
  );
};

const MoverList = ({ items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {items.map(m => (
      <div key={m.country} style={ovStyles.moverRow}>
        <span style={ovStyles.rankFlag}>{COUNTRY_FLAGS[m.country]}</span>
        <span style={ovStyles.moverCountry}>{m.country}</span>
        <span style={ovStyles.moverValue}>{formatOku(m.total)}億円</span>
        <Delta change={{ value: m.growth, positive: m.growth >= 0 }} size="md" />
      </div>
    ))}
    {!items.length && <div style={{ fontSize: 12, color: T.faint, padding: 8 }}>データなし</div>}
  </div>
);

const ovStyles = {
  rankRow: {
    display: 'grid',
    gridTemplateColumns: '28px minmax(90px, 140px) 1fr auto',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: `1px solid ${T.lineSoft}`,
  },
  rankNum: {
    fontFamily: T.mono,
    fontSize: 11,
    fontWeight: 600,
    color: T.faint,
    fontVariantNumeric: 'tabular-nums',
  },
  rankCountry: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: T.ink,
    fontWeight: 500,
  },
  rankFlag: { fontSize: 16 },
  rankBarWrap: { minWidth: 80 },
  rankValue: {
    textAlign: 'right',
    minWidth: 80,
  },
  regRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regName: {
    fontSize: 14,
    fontWeight: 500,
    color: T.ink,
  },
  regValue: {
    fontFamily: T.sans,
    fontSize: 18,
    fontWeight: 700,
    color: T.inkDark,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.01em',
  },
  moverRow: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto auto',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: `1px solid ${T.lineSoft}`,
  },
  moverCountry: {
    fontSize: 14,
    color: T.ink,
    fontWeight: 500,
  },
  moverValue: {
    fontSize: 13,
    color: T.muted,
    fontVariantNumeric: 'tabular-nums',
  },
};

// ============================================================
// TREND CHART (shared by overview)
// ============================================================
const TrendChart = ({ data, highlightLabel }) => {
  const [metric, setMetric] = useState('total');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={trStyles.toggle}>
          {[
            { id: 'total', label: '消費額' },
            { id: 'perPerson', label: '客単価' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              style={{
                ...trStyles.toggleBtn,
                ...(metric === m.id ? trStyles.toggleBtnActive : {}),
              }}
            >{m.label}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 36 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={T.line} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: T.muted, fontFamily: T.mono }}
            axisLine={{ stroke: T.line }}
            tickLine={false}
            tickFormatter={(v) => {
              const [yy, q] = v.split('/');
              return `${q}`;
            }}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            xAxisId="year"
            tick={({ x, y, payload, index }) => {
              const [yy] = payload.value.split('/');
              const prev = index > 0 ? data[index - 1].label.split('/')[0] : null;
              if (yy !== prev) {
                return <text x={x} y={y + 16} textAnchor="start" style={{ fontSize: 10, fill: T.faint, fontFamily: T.mono, letterSpacing: '0.08em' }}>'{yy}</text>;
              }
              return null;
            }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: T.muted, fontFamily: T.mono }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => metric === 'total' ? `${(v / 10000).toFixed(1)}兆` : `${v}万`}
            width={42}
          />
          <Tooltip
            cursor={{ fill: T.lineSoft }}
            content={({ payload, label }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={trStyles.tip}>
                  <div style={trStyles.tipLabel}>{label}</div>
                  <div style={trStyles.tipRow}>
                    <span>消費額</span>
                    <span style={trStyles.tipVal}>{formatNum(d.total, 0)}億円</span>
                  </div>
                  <div style={trStyles.tipRow}>
                    <span>客単価</span>
                    <span style={trStyles.tipVal}>{d.perPerson.toFixed(1)}万円</span>
                  </div>
                </div>
              );
            }}
          />
          {metric === 'total' ? (
            <Bar dataKey="total" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => {
                const yy = d.label.split('/')[0];
                const isHighlight = highlightLabel && d.label === highlightLabel;
                const fill = isHighlight ? T.accent
                  : yy === '26' ? T.inkDark
                  : yy === '25' ? T.inkDark
                  : yy === '24' ? T.muted
                  : T.faint;
                return <Cell key={i} fill={fill} fillOpacity={isHighlight ? 1 : 0.85} />;
              })}
            </Bar>
          ) : (
            <Line
              type="monotone"
              dataKey="perPerson"
              stroke={T.accent}
              strokeWidth={2}
              dot={{ fill: T.accent, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const trStyles = {
  toggle: {
    display: 'flex',
    gap: 2,
    padding: 2,
    backgroundColor: T.lineSoft,
    borderRadius: 3,
  },
  toggleBtn: {
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: T.muted,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    color: T.inkDark,
    fontWeight: 700,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  tip: {
    backgroundColor: T.inkDark,
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 3,
    fontSize: 12,
    minWidth: 160,
  },
  tipLabel: {
    fontFamily: T.mono,
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 8,
    letterSpacing: '0.05em',
  },
  tipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 4,
  },
  tipVal: {
    fontFamily: T.mono,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
};

// ============================================================
// TAB 2: 国別 (Countries) - Full ranking with expandable detail
// ============================================================
const CountriesTab = ({ data, prev, sheets, salesData, loadingSales, expanded, setExpanded }) => {
  const [viewMode, setViewMode] = useState('ranking');
  const [showAll, setShowAll] = useState(false);
  const INITIAL = 8;

  const sorted = useMemo(() => {
    if (!data?.length) return [];
    return data
      .filter(d => d.country !== '全国籍・地域' && d.country !== 'その他' && d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const displayed = showAll ? sorted : sorted.slice(0, INITIAL);

  const grouped = useMemo(() => {
    const g = {};
    sorted.forEach(c => {
      const r = getRegion(c.country);
      if (!g[r]) g[r] = [];
      g[r].push(c);
    });
    return g;
  }, [sorted]);

  return (
    <Card>
      <SectionTitle
        kicker="Countries & Regions"
        title="国・地域別 詳細"
        subtitle={`${sheets?.periodLabel} 消費額・費目別内訳`}
        aside={
          <div style={ctryStyles.modeToggle}>
            {[
              { id: 'ranking', label: '順位' },
              { id: 'region', label: '地域' },
            ].map(m => (
              <button key={m.id} onClick={() => setViewMode(m.id)}
                style={{
                  ...ctryStyles.modeBtn,
                  ...(viewMode === m.id ? ctryStyles.modeBtnActive : {}),
                }}>{m.label}</button>
            ))}
          </div>
        }
      />

      {viewMode === 'ranking' ? (
        <>
          <div style={ctryStyles.list}>
            {displayed.map((c, i) => (
              <CountryRow
                key={c.country}
                country={c}
                rank={i + 1}
                prev={prev}
                expanded={expanded === c.country}
                onToggle={() => setExpanded(expanded === c.country ? null : c.country)}
                salesData={salesData[c.country]}
                loadingSales={loadingSales && expanded === c.country}
              />
            ))}
          </div>
          {sorted.length > INITIAL && (
            <button style={ctryStyles.moreBtn} onClick={() => setShowAll(!showAll)}>
              {showAll ? '閉じる ↑' : `他 ${sorted.length - INITIAL} 市場を表示 ↓`}
            </button>
          )}
        </>
      ) : (
        Object.entries(REGION_GROUPS).map(([region]) => {
          const items = grouped[region];
          if (!items?.length) return null;
          const rt = items.reduce((s, c) => s + c.total, 0);
          return (
            <div key={region} style={ctryStyles.regionBlock}>
              <div style={ctryStyles.regionHdr}>
                <div style={{
                  width: 3, height: 20, backgroundColor: T.region[region], marginRight: 12,
                }} />
                <span style={ctryStyles.regionName}>{region}</span>
                <span style={ctryStyles.regionCount}>{items.length} 市場</span>
                <span style={ctryStyles.regionTotal}>
                  <BigNum value={formatOku(rt)} unit="億円" size="md" />
                </span>
              </div>
              {items.map((c, i) => (
                <CountryRow
                  key={c.country}
                  country={c}
                  rank={i + 1}
                  prev={prev}
                  expanded={expanded === c.country}
                  onToggle={() => setExpanded(expanded === c.country ? null : c.country)}
                  salesData={salesData[c.country]}
                  loadingSales={loadingSales && expanded === c.country}
                />
              ))}
            </div>
          );
        })
      )}
    </Card>
  );
};

const CountryRow = ({ country, rank, prev, expanded, onToggle, salesData, loadingSales }) => {
  const prevC = prev?.find(p => p.country === country.country);
  const change = prevC ? pctChange(country.total, prevC.total) : null;
  const region = getRegion(country.country);

  return (
    <div style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
      <div
        onClick={onToggle}
        style={{
          ...ctryStyles.row,
          backgroundColor: expanded ? T.lineSoft : 'transparent',
        }}
        className="country-row"
      >
        <span style={ctryStyles.rowRank}>{String(rank).padStart(2, '0')}</span>
        <span style={ctryStyles.rowFlag}>{COUNTRY_FLAGS[country.country]}</span>
        <span style={{
          width: 2, height: 18, backgroundColor: T.region[region], marginRight: 6,
        }} />
        <span style={ctryStyles.rowName}>{country.country}</span>
        <span style={ctryStyles.rowValue}>
          <BigNum value={formatOku(country.total)} unit="億円" size="md" />
        </span>
        <span style={{ minWidth: 70, textAlign: 'right' }}>
          <Delta change={change} />
        </span>
        <span style={{
          ...ctryStyles.rowArrow,
          transform: expanded ? 'rotate(180deg)' : 'none',
        }}>▾</span>
      </div>

      {expanded && (
        <div style={ctryStyles.expandBox}>
          <ExpenseBreakdown country={country} prev={prevC} />
          {salesData && salesData.length > 0 && <SalesTable data={salesData} />}
          {loadingSales && !salesData && (
            <div style={{ padding: 16, fontSize: 12, color: T.muted, textAlign: 'center' }}>
              買物品目データを読み込み中...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ExpenseBreakdown = ({ country, prev }) => {
  const cats = [
    { key: 'accommodation', label: '宿泊' },
    { key: 'food', label: '飲食' },
    { key: 'transport', label: '交通' },
    { key: 'entertainment', label: '娯楽' },
    { key: 'shopping', label: '買物' },
    { key: 'other', label: 'その他' },
  ];
  return (
    <div>
      <div style={ctryStyles.breakdownTitle}>費目別内訳</div>
      <div style={ctryStyles.breakdownGrid}>
        {cats.map(c => {
          const val = country[c.key] || 0;
          const pct = country.total ? (val / country.total) * 100 : 0;
          const pv = prev?.[c.key] || 0;
          const chg = pv ? pctChange(val, pv) : null;
          return (
            <div key={c.key} style={ctryStyles.breakdownCell}>
              <div style={ctryStyles.breakdownLabel}>
                <span>{c.label}</span>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={ctryStyles.breakdownValue}>
                <span style={{
                  fontFamily: T.sans,
                  fontSize: 17,
                  fontWeight: 700,
                  color: T.inkDark,
                  fontVariantNumeric: 'tabular-nums',
                }}>{formatOku(val)}</span>
                <span style={{ fontSize: 10, color: T.muted, marginLeft: 3 }}>億</span>
                {chg && <span style={{ marginLeft: 8 }}><Delta change={chg} size="sm" /></span>}
              </div>
              <div style={{ marginTop: 6 }}>
                <HBar value={pct} max={100} color={T.inkDark} height={3} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SalesTable = ({ data }) => (
  <div style={{ marginTop: 20 }}>
    <div style={ctryStyles.breakdownTitle}>買物品目別 購入者単価（年間）</div>
    <table style={ctryStyles.salesTbl}>
      <thead>
        <tr>
          <th style={ctryStyles.th}>品目</th>
          <th style={ctryStyles.thR}>2023年</th>
          <th style={ctryStyles.thR}>2024年</th>
          <th style={ctryStyles.thR}>前年比</th>
        </tr>
      </thead>
      <tbody>
        {data.map((s, i) => {
          const growth = s.yoy ? (s.yoy - 1) * 100 : null;
          return (
            <tr key={i}>
              <td style={ctryStyles.td}>{s.item}</td>
              <td style={ctryStyles.tdR}>{formatNum(s.y2023, 0)}円</td>
              <td style={ctryStyles.tdR}>{formatNum(s.y2024, 0)}円</td>
              <td style={ctryStyles.tdR}>
                {growth !== null && <Delta change={{ value: growth, positive: growth >= 0 }} size="sm" />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const ctryStyles = {
  modeToggle: {
    display: 'flex',
    gap: 2,
    padding: 2,
    backgroundColor: T.lineSoft,
    borderRadius: 3,
  },
  modeBtn: {
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: T.muted,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
  },
  modeBtnActive: {
    backgroundColor: '#fff',
    color: T.inkDark,
    fontWeight: 700,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  list: { },
  row: {
    display: 'grid',
    gridTemplateColumns: '32px 22px 6px 1fr auto 90px 20px',
    alignItems: 'center',
    gap: 10,
    padding: '14px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  rowRank: {
    fontFamily: T.mono,
    fontSize: 11,
    fontWeight: 600,
    color: T.faint,
    fontVariantNumeric: 'tabular-nums',
  },
  rowFlag: { fontSize: 16, textAlign: 'center' },
  rowName: {
    fontSize: 14,
    fontWeight: 500,
    color: T.ink,
  },
  rowValue: {
    textAlign: 'right',
    minWidth: 90,
  },
  rowArrow: {
    fontSize: 10,
    color: T.faint,
    transition: 'transform 0.2s',
    textAlign: 'center',
  },
  expandBox: {
    padding: '20px 24px 24px',
    backgroundColor: T.bg,
    borderTop: `1px solid ${T.lineSoft}`,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: T.muted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 14,
  },
  breakdownCell: {
    backgroundColor: '#fff',
    border: `1px solid ${T.line}`,
    padding: 12,
    borderRadius: 3,
  },
  breakdownLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: T.ink,
    fontWeight: 500,
    marginBottom: 4,
  },
  breakdownValue: {
    display: 'flex',
    alignItems: 'baseline',
  },
  moreBtn: {
    width: '100%',
    padding: 12,
    fontSize: 12,
    fontWeight: 600,
    color: T.muted,
    backgroundColor: 'transparent',
    border: `1px dashed ${T.line}`,
    borderRadius: 3,
    cursor: 'pointer',
    marginTop: 8,
  },
  regionBlock: {
    marginBottom: 24,
  },
  regionHdr: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${T.line}`,
    marginBottom: 4,
  },
  regionName: {
    fontFamily: T.sans,
    fontSize: 16,
    fontWeight: 700,
    color: T.inkDark,
  },
  regionCount: {
    fontSize: 11,
    color: T.faint,
    marginLeft: 10,
  },
  regionTotal: {
    marginLeft: 'auto',
  },
  salesTbl: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: `2px solid ${T.line}`,
    fontSize: 11,
    fontWeight: 700,
    color: T.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  thR: {
    textAlign: 'right',
    padding: '8px 10px',
    borderBottom: `2px solid ${T.line}`,
    fontSize: 11,
    fontWeight: 700,
    color: T.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: {
    padding: '8px 10px',
    borderBottom: `1px solid ${T.lineSoft}`,
    color: T.ink,
  },
  tdR: {
    padding: '8px 10px',
    borderBottom: `1px solid ${T.lineSoft}`,
    textAlign: 'right',
    fontFamily: T.mono,
    fontVariantNumeric: 'tabular-nums',
    color: T.ink,
  },
};

// ============================================================
// TAB 3: 構成 (Composition) - Expense breakdown focus
// ============================================================
const CompositionTab = ({ data, prev, sheets }) => {
  const totalRow = data?.[0];
  const prevTotal = prev?.[0];

  const overallStack = useMemo(() => {
    if (!totalRow) return [];
    const cats = [
      { key: 'accommodation', label: '宿泊費', color: T.expense.accommodation },
      { key: 'food',          label: '飲食費', color: T.expense.food },
      { key: 'transport',     label: '交通費', color: T.expense.transport },
      { key: 'entertainment', label: '娯楽等', color: T.expense.entertainment },
      { key: 'shopping',      label: '買物代', color: T.expense.shopping },
      { key: 'other',         label: 'その他', color: T.expense.other },
    ];
    return cats.map(c => ({
      ...c,
      value: totalRow[c.key] || 0,
      share: totalRow.total ? (totalRow[c.key] / totalRow.total) * 100 : 0,
      prevValue: prevTotal?.[c.key] || 0,
    }));
  }, [totalRow, prevTotal]);

  const topStacks = useMemo(() => {
    if (!data?.length) return [];
    return data
      .filter(d => d.country !== '全国籍・地域' && d.country !== 'その他' && d.total > 200)
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
      .map(d => ({
        country: d.country,
        total: d.total,
        acc:  d.total ? (d.accommodation / d.total) * 100 : 0,
        accAmt:  d.accommodation || 0,
        food: d.total ? (d.food / d.total) * 100 : 0,
        foodAmt: d.food || 0,
        trans:   d.total ? (d.transport / d.total) * 100 : 0,
        transAmt: d.transport || 0,
        ent:     d.total ? (d.entertainment / d.total) * 100 : 0,
        entAmt:  d.entertainment || 0,
        shop:    d.total ? (d.shopping / d.total) * 100 : 0,
        shopAmt: d.shopping || 0,
        oth:     d.total ? (d.other / d.total) * 100 : 0,
        othAmt:  d.other || 0,
      }));
  }, [data]);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Overall composition */}
      <Card>
        <SectionTitle
          kicker="Overall Composition"
          title="全体 費目構成"
          subtitle={`${sheets?.periodLabel} 全国籍・地域`}
        />
        <div style={cmpStyles.overallBar}>
          {overallStack.map(s => (
            <div
              key={s.key}
              title={`${s.label}：${formatOku(s.value)}億円（${s.share.toFixed(1)}%）`}
              style={{
                width: `${s.share}%`,
                backgroundColor: s.color,
                height: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'default',
                transition: 'filter 0.15s ease',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
            >
              {s.share >= 6 && (
                <>
                  <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85, letterSpacing: '0.02em' }}>{s.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 1 }}>
                    {s.share.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={cmpStyles.overallLegend}>
          {overallStack.map(s => {
            const chg = s.prevValue ? pctChange(s.value, s.prevValue) : null;
            return (
              <div key={s.key} style={cmpStyles.overallItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, backgroundColor: s.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{s.label}</span>
                </div>
                <div style={{
                  fontFamily: T.sans, fontSize: 22, fontWeight: 700, color: T.inkDark,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                }}>
                  {s.share.toFixed(1)}<span style={{ fontSize: 13, color: T.muted, marginLeft: 2 }}>%</span>
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: T.mono }}>
                  {formatNum(s.value, 0)}億円
                  {chg && <span style={{ marginLeft: 6 }}><Delta change={chg} size="sm" /></span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Country comparison */}
      <Card>
        <SectionTitle
          kicker="By Country"
          title="国別 費目比率"
          subtitle="上位12市場の費目構成を比較"
        />
        <div style={cmpStyles.stackLegend}>
          {[
            { label: '宿泊',   color: T.expense.accommodation },
            { label: '飲食',   color: T.expense.food },
            { label: '交通',   color: T.expense.transport },
            { label: '娯楽',   color: T.expense.entertainment },
            { label: '買物',   color: T.expense.shopping },
            { label: 'その他', color: T.expense.other },
          ].map(l => (
            <div key={l.label} style={cmpStyles.legendItem}>
              <span style={{ width: 12, height: 12, backgroundColor: l.color }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {topStacks.map(s => (
            <div key={s.country} style={cmpStyles.stackRow} className="stack-row">
              <div style={cmpStyles.stackLabel}>
                <span style={{ fontSize: 14 }}>{COUNTRY_FLAGS[s.country]}</span>
                <span style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{s.country}</span>
              </div>
              <div style={cmpStyles.stackBars}>
                <StackSeg pct={s.acc}   amt={s.accAmt}   country={s.country} label="宿泊"   color={T.expense.accommodation} />
                <StackSeg pct={s.food}  amt={s.foodAmt}  country={s.country} label="飲食"   color={T.expense.food} />
                <StackSeg pct={s.trans} amt={s.transAmt} country={s.country} label="交通"   color={T.expense.transport} />
                <StackSeg pct={s.ent}   amt={s.entAmt}   country={s.country} label="娯楽"   color={T.expense.entertainment} />
                <StackSeg pct={s.shop}  amt={s.shopAmt}  country={s.country} label="買物"   color={T.expense.shopping} />
                <StackSeg pct={s.oth}   amt={s.othAmt}   country={s.country} label="その他" color={T.expense.other} />
              </div>
              <div style={cmpStyles.stackTotal}>
                <BigNum value={formatOku(s.total)} unit="億" size="md" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Stacked bar segment with inline % label and hover tooltip
const StackSeg = ({ pct, amt, country, label, color }) => {
  if (pct <= 0) return null;
  return (
    <div
      title={`${country} · ${label}：${formatOku(amt)}億円（${pct.toFixed(1)}%）`}
      style={{
        width: `${pct}%`,
        height: '100%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        cursor: 'default',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        transition: 'filter 0.15s ease',
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.18)')}
      onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
    >
      {pct >= 8 ? pct.toFixed(0) : ''}
    </div>
  );
};

const cmpStyles = {
  overallBar: {
    display: 'flex',
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
    border: `1px solid ${T.line}`,
  },
  overallLegend: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 16,
  },
  overallItem: {},
  stackLegend: {
    display: 'flex',
    gap: 16,
    marginBottom: 18,
    flexWrap: 'wrap',
    paddingBottom: 12,
    borderBottom: `1px solid ${T.lineSoft}`,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: T.muted,
  },
  stackRow: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr 80px',
    alignItems: 'center',
    gap: 14,
    padding: '6px 0',
  },
  stackLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stackBars: {
    display: 'flex',
    height: 22,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stackTotal: {
    textAlign: 'right',
  },
};

// ============================================================
// TAB 4: 分析 (Analysis) - Sub-tabs
// ============================================================
const AnalysisTab = ({ data, prev, sheets }) => {
  const [sub, setSub] = useState('matrix');
  const subs = [
    { id: 'matrix', label: 'ポジショニング' },
    { id: 'share', label: '市場シェア' },
    { id: 'growth', label: '増減分析' },
    { id: 'compare', label: '国別比較' },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={anlStyles.subNav}>
        {subs.map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            style={{
              ...anlStyles.subBtn,
              ...(sub === s.id ? anlStyles.subBtnActive : {}),
            }}
          >{s.label}</button>
        ))}
      </div>
      {sub === 'matrix' && <MatrixSection data={data} prev={prev} sheets={sheets} />}
      {sub === 'share' && <MarketShareSection data={data} sheets={sheets} />}
      {sub === 'growth' && <GrowthSection data={data} prev={prev} sheets={sheets} />}
      {sub === 'compare' && <CompareSection data={data} prev={prev} sheets={sheets} />}
    </div>
  );
};

const anlStyles = {
  subNav: {
    display: 'flex',
    gap: 4,
    padding: 4,
    backgroundColor: T.surface,
    border: `1px solid ${T.line}`,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  subBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: T.muted,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
    fontFamily: T.sans,
  },
  subBtnActive: {
    backgroundColor: T.inkDark,
    color: '#fff',
    fontWeight: 700,
  },
};

// --- Analysis: Matrix ---
const MatrixSection = ({ data, prev, sheets }) => {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    const prevMap = {};
    (prev || []).forEach(p => { prevMap[p.country] = p; });
    return data
      .filter(d => d.country !== '全国籍・地域' && d.country !== 'その他' && d.total > 100 && d.perPerson > 0)
      .map(d => {
        const pp = prevMap[d.country];
        const growth = pp?.total ? ((d.total - pp.total) / pp.total) * 100 : 0;
        return {
          country: d.country,
          flag: COUNTRY_FLAGS[d.country],
          growth,
          perPerson: d.perPerson / 10000,
          total: d.total,
          region: getRegion(d.country),
          hasPrev: !!pp?.total,
        };
      });
  }, [data, prev]);

  return (
    <Card>
      <SectionTitle
        kicker="Positioning Matrix"
        title="成長率 × 客単価"
        subtitle="バブルサイズ = 消費額規模"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 24 }} className="matrix-grid">
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.line} />
            <XAxis
              type="number"
              dataKey="growth"
              tick={{ fontSize: 11, fill: T.muted, fontFamily: T.mono }}
              axisLine={{ stroke: T.line }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              label={{ value: '成長率（前期比）', position: 'bottom', offset: 20, fontSize: 11, fill: T.muted }}
            />
            <YAxis
              type="number"
              dataKey="perPerson"
              tick={{ fontSize: 11, fill: T.muted, fontFamily: T.mono }}
              axisLine={{ stroke: T.line }}
              tickLine={false}
              tickFormatter={(v) => `${v}万`}
              label={{ value: '客単価（万円）', angle: -90, position: 'left', offset: 20, fontSize: 11, fill: T.muted }}
            />
            <ZAxis dataKey="total" range={[80, 800]} />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div style={trStyles.tip}>
                    <div style={trStyles.tipLabel}>{d.flag} {d.country}</div>
                    <div style={trStyles.tipRow}><span>成長率</span><span style={trStyles.tipVal}>{d.hasPrev ? `${d.growth >= 0 ? '+' : ''}${d.growth.toFixed(1)}%` : 'N/A'}</span></div>
                    <div style={trStyles.tipRow}><span>客単価</span><span style={trStyles.tipVal}>{d.perPerson.toFixed(1)}万円</span></div>
                    <div style={trStyles.tipRow}><span>消費額</span><span style={trStyles.tipVal}>{formatOku(d.total)}億円</span></div>
                  </div>
                );
              }}
            />
            <Scatter data={chartData}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={T.region[e.region]} fillOpacity={0.75} stroke={T.region[e.region]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div>
          <div style={mxStyles.listTitle}>主要市場</div>
          <div style={mxStyles.list}>
            {[...chartData].sort((a, b) => b.total - a.total).slice(0, 12).map((d, i) => (
              <div key={d.country} style={mxStyles.listRow}>
                <span style={{
                  fontFamily: T.mono, fontSize: 10, color: T.faint, minWidth: 20,
                  fontVariantNumeric: 'tabular-nums',
                }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 14 }}>{d.flag}</span>
                <span style={{ fontSize: 12, color: T.ink, fontWeight: 500, flex: 1 }}>{d.country}</span>
                <Delta change={{ value: d.growth, positive: d.growth >= 0 }} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={mxStyles.legend}>
        {Object.entries(T.region).map(([r, c]) => (
          <div key={r} style={mxStyles.legendItem}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c, display: 'inline-block' }} />
            <span>{r}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const mxStyles = {
  listTitle: {
    fontSize: 11, fontWeight: 700, color: T.muted,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.line}`,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listRow: { display: 'flex', alignItems: 'center', gap: 8 },
  legend: {
    display: 'flex', gap: 18, justifyContent: 'center',
    marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.line}`,
    fontSize: 12, color: T.muted,
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
};

// --- Analysis: Market Share ---
const MarketShareSection = ({ data, sheets }) => {
  const [hovered, setHovered] = useState(null);
  const share = useMemo(() => {
    if (!data || data.length < 2) return [];
    const tot = data[0]?.total || 0;
    const countries = data.slice(1).filter(d => d.country !== 'その他');
    const sorted = [...countries].sort((a, b) => b.total - a.total);
    const top6 = sorted.slice(0, 6);
    const othTot = sorted.slice(6).reduce((s, c) => s + c.total, 0)
      + (data.find(d => d.country === 'その他')?.total || 0);
    const palette = [T.inkDark, T.accent, '#44403c', '#78716c', '#a8a29e', '#d6d3d1', T.lineSoft];
    const res = top6.map((c, i) => ({
      country: c.country, value: c.total, share: (c.total / tot) * 100,
      flag: COUNTRY_FLAGS[c.country], color: palette[i],
    }));
    if (othTot > 0) res.push({
      country: 'その他', value: othTot, share: (othTot / tot) * 100,
      flag: '—', color: palette[6],
    });
    return res;
  }, [data]);

  let cumul = 0;
  return (
    <Card>
      <SectionTitle
        kicker="Market Share"
        title="市場シェア"
        subtitle={`${sheets?.periodLabel} 国別消費額の構成比`}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 40, alignItems: 'center' }} className="share-grid">
        <svg viewBox="0 0 100 100" style={{ width: '100%' }}>
          {share.map((s, i) => {
            const start = cumul; cumul += s.share;
            const sa = (start / 100) * 360 - 90;
            const ea = (cumul / 100) * 360 - 90;
            const sr = (sa * Math.PI) / 180, er = (ea * Math.PI) / 180;
            const x1 = 50 + 42 * Math.cos(sr), y1 = 50 + 42 * Math.sin(sr);
            const x2 = 50 + 42 * Math.cos(er), y2 = 50 + 42 * Math.sin(er);
            const la = s.share > 50 ? 1 : 0;
            const isH = hovered === i;
            return (
              <path
                key={i}
                d={`M 50 50 L ${x1} ${y1} A 42 42 0 ${la} 1 ${x2} ${y2} Z`}
                fill={s.color}
                opacity={hovered === null ? 1 : isH ? 1 : 0.4}
                style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          <circle cx="50" cy="50" r="26" fill={T.surface} />
          {hovered !== null && (
            <text x="50" y="48" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: T.inkDark, fontFamily: T.sans }}>
              {share[hovered].share.toFixed(1)}%
            </text>
          )}
          {hovered !== null && (
            <text x="50" y="56" textAnchor="middle" style={{ fontSize: 4, fill: T.muted }}>
              {share[hovered].country}
            </text>
          )}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {share.map((s, i) => (
            <div key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...msStyles.row,
                backgroundColor: hovered === i ? T.lineSoft : 'transparent',
              }}
            >
              <span style={{ width: 14, height: 14, backgroundColor: s.color }} />
              <span style={msStyles.flag}>{s.flag}</span>
              <span style={msStyles.country}>{s.country}</span>
              <span style={msStyles.pct}>{s.share.toFixed(1)}%</span>
              <span style={msStyles.val}>{formatOku(s.value, 0)}億円</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const msStyles = {
  row: {
    display: 'grid',
    gridTemplateColumns: '14px 20px 1fr 60px 100px',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 3,
    transition: 'background-color 0.15s',
    cursor: 'pointer',
  },
  flag: { fontSize: 14 },
  country: { fontSize: 14, color: T.ink, fontWeight: 500 },
  pct: {
    fontFamily: T.sans, fontSize: 18, fontWeight: 700,
    color: T.inkDark, textAlign: 'right',
    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
  },
  val: {
    fontFamily: T.mono, fontSize: 12, color: T.muted,
    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
  },
};

// --- Analysis: Growth Waterfall ---
const GrowthSection = ({ data, prev, sheets }) => {
  const waterfall = useMemo(() => {
    if (!data?.length || !prev?.length) return null;
    const cur = data[0], pv = prev[0];
    if (!cur || !pv) return null;
    const cats = [
      { key: 'accommodation', label: '宿泊' },
      { key: 'food', label: '飲食' },
      { key: 'shopping', label: '買物' },
      { key: 'transport', label: '交通' },
      { key: 'entertainment', label: '娯楽' },
      { key: 'other', label: 'その他' },
    ];
    const items = cats.map(c => ({
      label: c.label,
      current: cur[c.key] || 0,
      previous: pv[c.key] || 0,
      diff: (cur[c.key] || 0) - (pv[c.key] || 0),
      growth: pv[c.key] ? (((cur[c.key] || 0) - pv[c.key]) / pv[c.key]) * 100 : 0,
    }));
    const totalDiff = items.reduce((s, d) => s + d.diff, 0);
    return { items, totalDiff };
  }, [data, prev]);

  if (!waterfall) return <Card><div style={{ color: T.muted, padding: 20 }}>データ不足</div></Card>;
  const maxDiff = Math.max(...waterfall.items.map(d => Math.abs(d.diff)));

  return (
    <Card>
      <SectionTitle
        kicker="Year-on-Year"
        title="費目別 増減"
        subtitle={`${sheets?.prevLabel} → ${sheets?.periodLabel}`}
        aside={
          <div style={{
            padding: '8px 16px',
            border: `1px solid ${waterfall.totalDiff >= 0 ? T.positive : T.negative}`,
            borderRadius: 3,
            color: waterfall.totalDiff >= 0 ? T.positive : T.negative,
            fontFamily: T.mono,
            fontSize: 14,
            fontWeight: 700,
          }}>
            合計 {waterfall.totalDiff >= 0 ? '+' : ''}{formatNum(waterfall.totalDiff, 0)}億円
          </div>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {waterfall.items.map((d, i) => (
          <div key={i} style={gsStyles.row}>
            <div style={gsStyles.label}>{d.label}</div>
            <div style={gsStyles.barArea}>
              <div style={gsStyles.center} />
              {d.diff >= 0 ? (
                <>
                  <div style={{ width: '50%' }} />
                  <div style={{
                    width: `${(d.diff / maxDiff) * 48}%`,
                    height: 28, backgroundColor: T.positive, borderRadius: 2,
                  }} />
                </>
              ) : (
                <>
                  <div style={{ width: `${(1 - Math.abs(d.diff) / maxDiff * 0.48) * 50}%` }} />
                  <div style={{
                    width: `${(Math.abs(d.diff) / maxDiff) * 48}%`,
                    height: 28, backgroundColor: T.negative, borderRadius: 2,
                  }} />
                </>
              )}
            </div>
            <div style={gsStyles.values}>
              <div style={{
                fontFamily: T.mono, fontSize: 14, fontWeight: 700,
                color: d.diff >= 0 ? T.positive : T.negative,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {d.diff >= 0 ? '+' : ''}{formatNum(d.diff, 0)}
              </div>
              <Delta change={{ value: d.growth, positive: d.growth >= 0 }} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const gsStyles = {
  row: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 120px',
    alignItems: 'center',
    gap: 16,
    padding: '10px 4px',
    borderBottom: `1px solid ${T.lineSoft}`,
  },
  label: {
    fontSize: 13, fontWeight: 600, color: T.ink,
  },
  barArea: {
    position: 'relative',
    height: 28,
    display: 'flex',
    alignItems: 'center',
  },
  center: {
    position: 'absolute', left: '50%', top: 0, bottom: 0,
    width: 1, backgroundColor: T.line,
  },
  values: {
    textAlign: 'right',
  },
};

// --- Analysis: Country Compare ---
const CompareSection = ({ data, prev, sheets }) => {
  const countries = useMemo(() => {
    if (!data) return [];
    return data.filter(d => d.country !== '全国籍・地域' && d.country !== 'その他').map(d => d.country);
  }, [data]);

  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [c3, setC3] = useState('');

  useEffect(() => {
    if (countries.length >= 3 && !c1) {
      setC1(countries[0]); setC2(countries[1]); setC3(countries[2]);
    }
  }, [countries, c1]);

  const getData = (n) => {
    const cur = data?.find(d => d.country === n);
    const pv = prev?.find(d => d.country === n);
    if (!cur) return null;
    const growth = pv?.total ? ((cur.total - pv.total) / pv.total) * 100 : 0;
    return {
      ...cur,
      growth,
      shopRatio: cur.total ? (cur.shopping / cur.total) * 100 : 0,
      perPersonMan: cur.perPerson ? cur.perPerson / 10000 : 0,
      visitorsMan: cur.visitors ? cur.visitors / 10000 : 0,
    };
  };

  const all = [getData(c1), getData(c2), getData(c3)].filter(Boolean);
  if (!all.length) return null;

  const metrics = [
    { label: '消費額', key: 'total', unit: '億円', fmt: v => formatNum(v, 0) },
    { label: '訪日客数', key: 'visitorsMan', unit: '万人', fmt: v => formatNum(v, 1) },
    { label: '客単価', key: 'perPersonMan', unit: '万円', fmt: v => formatNum(v, 1) },
    { label: '成長率', key: 'growth', unit: '%', fmt: v => (v >= 0 ? '+' : '') + v.toFixed(1) },
    { label: '買物比率', key: 'shopRatio', unit: '%', fmt: v => v.toFixed(1) },
    { label: '平均泊数', key: 'avgNights', unit: '泊', fmt: v => (v || 0).toFixed(1) },
  ];

  return (
    <Card>
      <SectionTitle
        kicker="Side-by-Side"
        title="国別比較"
        subtitle="最大3市場を選択して詳細比較"
      />
      <div style={csStyles.selectors}>
        {[{v: c1, set: setC1}, {v: c2, set: setC2}, {v: c3, set: setC3}].map((sel, i) => (
          <React.Fragment key={i}>
            <select value={sel.v} onChange={e => sel.set(e.target.value)} style={csStyles.select}>
              {i === 2 && <option value="">— 選択なし —</option>}
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {i < 2 && <span style={csStyles.vs}>VS</span>}
          </React.Fragment>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `120px repeat(${all.length}, 1fr)`,
        gap: 0,
      }}>
        <div style={csStyles.hdrCell}></div>
        {all.map((d, i) => (
          <div key={i} style={csStyles.hdrCountry}>
            <span style={{ fontSize: 22 }}>{COUNTRY_FLAGS[d.country]}</span>
            <span style={{
              fontFamily: T.sans, fontSize: 18, fontWeight: 700,
              color: T.inkDark,
            }}>{d.country}</span>
          </div>
        ))}

        {metrics.map(m => {
          const vals = all.map(d => d[m.key] || 0);
          const maxV = Math.max(...vals);
          return (
            <React.Fragment key={m.key}>
              <div style={csStyles.rowLabel}>{m.label}</div>
              {all.map((d, i) => {
                const v = d[m.key] || 0;
                const isMax = v === maxV && vals.filter(x => x === maxV).length === 1;
                return (
                  <div key={i} style={{
                    ...csStyles.rowValue,
                    backgroundColor: isMax ? '#f0fdf4' : 'transparent',
                  }}>
                    <span style={{
                      fontFamily: T.sans, fontSize: 22, fontWeight: 700,
                      color: T.inkDark, fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                    }}>{m.fmt(v)}</span>
                    <span style={{ fontSize: 11, color: T.muted, marginLeft: 3 }}>{m.unit}</span>
                    {isMax && <span style={csStyles.winBadge}>TOP</span>}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
};

const csStyles = {
  selectors: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
    flexWrap: 'wrap',
  },
  select: {
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 600,
    border: `1px solid ${T.line}`,
    borderRadius: 3,
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontFamily: T.sans,
    minWidth: 140,
    color: T.inkDark,
  },
  vs: {
    fontFamily: T.mono,
    fontSize: 12,
    fontWeight: 700,
    color: T.faint,
    letterSpacing: '0.1em',
  },
  hdrCell: {
    borderBottom: `2px solid ${T.inkDark}`,
    padding: '16px 0',
  },
  hdrCountry: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '16px 12px',
    borderBottom: `2px solid ${T.inkDark}`,
  },
  rowLabel: {
    padding: '14px 0',
    fontSize: 13, fontWeight: 600, color: T.muted,
    borderBottom: `1px solid ${T.lineSoft}`,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  rowValue: {
    padding: '14px 12px',
    display: 'flex', alignItems: 'baseline',
    borderBottom: `1px solid ${T.lineSoft}`,
    borderRadius: 2,
  },
  winBadge: {
    marginLeft: 10,
    fontSize: 10, fontWeight: 700,
    color: T.positive,
    padding: '2px 6px',
    border: `1px solid ${T.positive}`,
    borderRadius: 2,
    letterSpacing: '0.05em',
  },
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [period, setPeriod] = useState('2026Q1');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [prev, setPrev] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [salesData, setSalesData] = useState({});
  const [loadingSales, setLoadingSales] = useState(false);

  const sheets = useMemo(() => resolveSheets(period), [period]);

  // Ref on root element for accurate height measurement
  const rootRef = useRef(null);

  // Stable iframe height with explicit re-broadcast on tab/period change
  useIframeHeight(rootRef, activeTab, period, loading, expanded);

  // Data fetch
  useEffect(() => {
    if (!sheets) return;
    let cancel = false;
    const run = async () => {
      setLoading(true); setError(null);
      setData([]); setPrev([]); setExpanded(null);
      try {
        await delay(80);
        const e = await fetchSheet(sheets.expense);
        await delay(180);
        const v = await fetchSheet(sheets.visitor);
        await delay(180);
        const pe = await fetchSheet(sheets.prevExpense);
        await delay(180);
        const pv = await fetchSheet(sheets.prevVisitor);
        if (cancel) return;
        setData(mergeData(parseExpense(e), parseVisitor(v)));
        setPrev(mergeData(parseExpense(pe), parseVisitor(pv)));
      } catch (err) {
        if (!cancel) setError('データの読み込みに失敗しました');
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    run();
    return () => { cancel = true; };
  }, [sheets]);

  // Reset expanded country when tab changes
  useEffect(() => {
    setExpanded(null);
  }, [activeTab]);

  // Sales data (on expand)
  useEffect(() => {
    if (!expanded) return;
    if (salesData[expanded]) return;
    const salesCountries = ['韓国', '中国', '台湾', '香港', '米国', 'タイ', 'ベトナム', 'オーストラリア', 'シンガポール', 'マレーシア', 'インドネシア', 'フィリピン', 'インド', '英国', 'ドイツ', 'フランス', 'イタリア', 'スペイン', 'ロシア', 'カナダ'];
    if (!salesCountries.includes(expanded)) return;

    let cancel = false;
    const run = async () => {
      setLoadingSales(true);
      try {
        await delay(100);
        const rows = await fetchSheet(`営業_${expanded}`);
        if (cancel) return;
        if (!rows || rows.length < 5) { setLoadingSales(false); return; }
        const valid = ['菓子類', '酒類', '生鮮農産物', 'その他食料品・飲料・たばこ', '化粧品・香水', '医薬品', '健康グッズ・トイレタリー', '衣類', '靴・かばん・革製品', '電気製品', '時計・フィルムカメラ', '宝石・貴金属', '民芸品・伝統工芸品', '本・雑誌・ガイドブックなど', '音楽・映像・ゲームなどソフト', 'その他買物代'];
        const parsed = rows.slice(4).map(r => {
          const yoyRaw = String(r[3] || '');
          const yoy = yoyRaw.includes('%')
            ? parseFloat(yoyRaw.replace('%', '')) / 100
            : parseNumber(yoyRaw);
          return {
            item: r[0] || '',
            y2023: parseNumber(r[1]),
            y2024: parseNumber(r[2]),
            yoy,
          };
        }).filter(d => valid.includes(d.item) && (d.y2023 > 0 || d.y2024 > 0));
        if (parsed.length > 0) {
          setSalesData(p => ({ ...p, [expanded]: parsed }));
        }
      } catch (err) {
        console.warn(err);
      } finally {
        if (!cancel) setLoadingSales(false);
      }
    };
    run();
    return () => { cancel = true; };
  }, [expanded, salesData]);

  const kpi = useMemo(() => {
    const t = data[0];
    const p = prev.find(d => d.country === '全国籍・地域');
    if (!t) return null;
    const shopRatio = t.total ? (t.shopping / t.total) * 100 : 0;
    const prevShop = p?.total ? (p.shopping / p.total) * 100 : 0;
    return {
      total: t.total,
      totalChg: pctChange(t.total, p?.total),
      visitors: t.visitors ? t.visitors / 10000 : 0,
      visitorsChg: p?.visitors ? pctChange(t.visitors, p.visitors) : null,
      perPerson: t.perPerson ? t.perPerson / 10000 : 0,
      perPersonChg: p?.perPerson ? pctChange(t.perPerson, p.perPerson) : null,
      shopRatio,
      shopRatioChg: prevShop ? { value: shopRatio - prevShop, positive: shopRatio >= prevShop } : null,
    };
  }, [data, prev]);

  return (
    <div ref={rootRef} style={appStyles.root}>
      <HeroStrip sheets={sheets} kpi={kpi} loading={loading} />
      <StickyNav period={period} setPeriod={setPeriod} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={appStyles.main}>
        {error && <div style={appStyles.err}>{error}</div>}

        {loading ? (
          <div style={appStyles.loader}>
            <div style={appStyles.spinner} />
            <div style={appStyles.loaderText}>データ読み込み中...</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview'    && <OverviewTab data={data} prev={prev} sheets={sheets} />}
            {activeTab === 'countries'   && <CountriesTab data={data} prev={prev} sheets={sheets}
                                                           salesData={salesData} loadingSales={loadingSales}
                                                           expanded={expanded} setExpanded={setExpanded} />}
            {activeTab === 'composition' && <CompositionTab data={data} prev={prev} sheets={sheets} />}
            {activeTab === 'analysis'    && <AnalysisTab data={data} prev={prev} sheets={sheets} />}
          </>
        )}
      </main>

      <footer style={appStyles.footer}>
        <span>出典：観光庁「インバウンド消費動向調査」</span>
        <span style={{ color: T.faint }}>{sheets?.periodLabel}</span>
      </footer>
    </div>
  );
}

const appStyles = {
  root: {
    backgroundColor: T.bg,
    fontFamily: T.sans,
    color: T.ink,
    lineHeight: 1.6,
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 24px 48px',
  },
  err: {
    padding: 16,
    backgroundColor: '#fef2f2',
    border: `1px solid #fecaca`,
    color: T.negative,
    fontSize: 13,
    marginBottom: 20,
    borderRadius: 3,
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
    gap: 16,
  },
  spinner: {
    width: 28, height: 28,
    border: `2px solid ${T.line}`,
    borderTopColor: T.inkDark,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    fontSize: 12,
    color: T.muted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  footer: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: T.muted,
    borderTop: `1px solid ${T.line}`,
    letterSpacing: '0.02em',
  },
};

// Inject global styles (fonts, spinner keyframe, reset, responsive rules)
const sheet = document.createElement('style');
sheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background-color: ${T.bg}; }
  body { min-height: 0; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  /* Scrollbar (webkit) */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 5px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.faint}; }

  /* ===== TABLET (900px and below) ===== */
  @media (max-width: 900px) {
    /* Hero: stack left + right */
    .hero-inner {
      grid-template-columns: 1fr !important;
      gap: 24px !important;
      padding: 32px 20px 28px !important;
    }
    /* KPI grid: 2x2 on tablet */
    .hero-kpi-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 20px;
    }
    .hero-kpi-grid > div:nth-child(odd) {
      border-left: none !important;
      padding-left: 0 !important;
    }
    .hero-kpi-grid > div:nth-child(1),
    .hero-kpi-grid > div:nth-child(2) {
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 16px;
    }

    /* Nav: stack */
    .nav-inner {
      padding: 12px 16px !important;
      gap: 12px !important;
    }
    .nav-periods {
      width: 100%;
      overflow-x: auto;
    }
    .nav-tabs {
      width: 100%;
      overflow-x: auto;
    }

    /* Overview: stack two-col */
    .two-col {
      grid-template-columns: 1fr !important;
    }
    /* Matrix: stack chart + list */
    .matrix-grid {
      grid-template-columns: 1fr !important;
    }
    /* Market share: stack donut + list */
    .share-grid {
      grid-template-columns: 1fr !important;
    }
    /* Pie section: stack current + prev */
    .pie-grid {
      grid-template-columns: 1fr !important;
    }
  }

  /* ===== MOBILE (600px and below) ===== */
  @media (max-width: 600px) {
    .hero-inner {
      padding: 28px 16px 24px !important;
    }
    .hero-kpi-grid {
      grid-template-columns: 1fr 1fr !important;
      gap: 14px !important;
    }
    .hero-kpi-grid > div {
      padding: 12px 14px !important;
      border-left: 1px solid rgba(255,255,255,0.15) !important;
    }
    .hero-kpi-grid > div:nth-child(odd) {
      border-left: none !important;
      padding-left: 14px !important;
    }

    /* Country row: compact */
    .country-row {
      grid-template-columns: 28px 20px 4px 1fr auto !important;
      gap: 8px !important;
      padding: 12px 8px !important;
    }
    .country-row > span:nth-last-child(2),
    .country-row > span:last-child {
      display: none;
    }

    /* Rank row: compact */
    .rank-row {
      grid-template-columns: 22px minmax(80px, 1fr) auto !important;
      gap: 10px !important;
    }
    .rank-row > div:nth-child(3) {
      display: none;
    }

    /* Stack row: label only */
    .stack-row {
      grid-template-columns: 100px 1fr 60px !important;
      gap: 8px !important;
    }
  }

  /* Focus / hover */
  button:focus-visible {
    outline: 2px solid ${T.accent};
    outline-offset: 2px;
  }
  select:focus-visible {
    outline: 2px solid ${T.accent};
    outline-offset: 2px;
  }

  /* Number tabular */
  .tabular { font-variant-numeric: tabular-nums; }
`;
document.head.appendChild(sheet);
