import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area,
  PieChart, Pie, ReferenceLine, Legend
} from 'recharts';
// ============================================================
// 설정
// ============================================================
const SHEET_ID = '1hF1Z-3LLgzzzFwc66xVqEXszNm3qSH8Xwl6DT01dQRs';
const API_KEY = 'AIzaSyAs_UERCv_a4ZCfrZI2XvThGMFPFRkStO0';
// ============================================================
// ⭐ データ構造（2026.9〜）
//   JNTO「国籍/月別 訪日外客数」Excelの年シートを、そのままタブに貼り付けて読む
//     JNTO_{当年}  … 毎月まるごと貼り替え（推計→暫定の修正も自動反映）
//     JNTO_{前年}  … 年1回
//   手入力が残るタブ: 訪日_特記（毎月）/ 訪日_年間（年1回）/ 訪日_月別推移・訪日_国別年間・訪日_長期推移（過去年のみ）
// ============================================================
// ⭐ 月次設定 — 毎月ここだけ更新すればラベル・シート名・列が全て追従
//    (JNTO PDF 1ページ=過去最高市場 / 2ページ=1〜N月累計)
// ============================================================
const CURRENT = {
  year: 2026,
  month: 9,
  // PDF1ページ「N月として過去最高」の市場（注記の並び順）
  recordMarkets: ['韓国', '台湾', 'シンガポール', 'インド', 'メキシコ', 'ロシア', '中東地域'],
  // うち「単月過去最高」
  singleMonthRecords: [],
  // モメンタム表の注記（単月の前年比がブレた主因。PDF「地域別概況」から）
  // データ区分（JNTO月別Excelの注記・斜体で判定。毎月更新）
  //   finalYear 以前＝確定値 / 当年 1〜provisionalThrough月＝暫定値 / それ以降＝推計値
  dataStatus: { finalYear: 2025, provisionalThrough: 7 },
  momentumNote: '単月の前年比は祝日・連休の年ズレや航空便・台風の影響を受けやすい（例：9月は中東情勢による航空券価格の上昇と減便、台風による欠航が多くの市場に影響）。',
};
// JNTO「訪日外客数の発表予定」より（推計値の発表日）。発表予定が出たら追加する（例 20260916.pdf）
//   ym＝推計値の対象月 / prov＝同じ日に暫定値になる月
const JNTO_RELEASES = [
  { ym: '2026-08', prov: '2026-06', date: '2026-09-16' },
  { ym: '2026-09', prov: '2026-07', date: '2026-10-21' },
  { ym: '2026-10', prov: '2026-08', date: '2026-11-18' },
  { ym: '2026-11', prov: '2026-09', date: '2026-12-16' },
];
const CY = CURRENT.year;
const CM = CURRENT.month;
const MONTHS = Array.from({ length: CM }, (_, i) => i + 1);
const PREV_M = CM === 1 ? { y: CY - 1, m: 12 } : { y: CY, m: CM - 1 };
const JNTO_MARKETS = ['韓国', '中国', '台湾', '香港', 'タイ', 'シンガポール', 'マレーシア', 'インドネシア', 'フィリピン', 'ベトナム', 'インド', '豪州', '米国', 'カナダ', 'メキシコ', '英国', 'フランス', 'ドイツ', 'イタリア', 'スペイン', 'ロシア', '北欧地域', '中東地域'];
const statusOf = (y, m = 12) => {
  const yy = Number(y);
  if (yy <= CURRENT.dataStatus.finalYear) return '確定';
  if (yy < CY) return '暫定';
  return m <= CURRENT.dataStatus.provisionalThrough ? '暫定' : '推計';
};
const STATUS_STYLE = {
  '確定': { background: '#eceff1', color: '#37474f', border: '1px solid #90a4ae' },
  '暫定': { background: '#fff', color: '#37474f', border: '1px solid #90a4ae' },
  '推計': { background: '#fff7ed', color: '#c2410c', border: '1px dashed #f97316' },
};
const StatusChip = ({ s, size = 10, suffix = '値' }) => (
  <span style={{ ...STATUS_STYLE[s], fontSize: size, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                 whiteSpace: 'nowrap', display: 'inline-block', lineHeight: 1.5, fontStyle: s === '推計' ? 'italic' : 'normal' }}>
    {s}{suffix}
  </span>
);
// 例:「1〜6月暫定値・7〜8月推計値」
const rangeStatusText = () => {
  const P = Math.min(CURRENT.dataStatus.provisionalThrough, CM);
  if (P >= CM) return `${CY}年1〜${CM}月暫定値`;
  if (P <= 0) return `${CY}年1〜${CM}月推計値`;
  const est = P + 1 === CM ? `${CM}月` : `${P + 1}〜${CM}月`;
  return `${CY}年1〜${P}月暫定値・${est}推計値`;
};
// 公表日・次回・最新かどうか（今日の日付で自動判定）
const releaseInfo = () => {
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const cur = `${CY}-${String(CM).padStart(2, '0')}`;
  const pub = JNTO_RELEASES.find(r => r.ym === cur) || null;
  const next = JNTO_RELEASES.filter(r => r.date > today).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  const done = JNTO_RELEASES.filter(r => r.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
  return { pub, next, isLatest: !!pub && !!done && done.ym === cur };
};
const jaDate = (d, withYear = true) => {
  const [y, m, dd] = d.split('-').map(Number);
  return withYear ? `${y}年${m}月${dd}日` : `${m}月${dd}日`;
};
const ReleaseLine = () => {
  const { pub, next, isLatest } = releaseInfo();
  const [ny, nm] = next ? next.ym.split('-').map(Number) : [];
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7, color: '#555', marginTop: 14 }}>
      <div>出典：JNTO「訪日外客統計」{pub && <>（{jaDate(pub.date)}公表）</>}
        {isLatest && <span style={{ marginLeft: 6, padding: '0 6px', fontSize: 12, fontWeight: 700, color: '#555', border: '1px solid #777', borderRadius: 2 }}>公表済みの最新</span>}
      </div>
      <div>次回更新：{next ? <>{ny}年{nm}月分 推計値（{jaDate(next.date, false)}予定）</> : '毎月中旬（JNTO発表に合わせて更新）'}</div>
    </div>
  );
};
const L = {
  ym: `${CY}年${CM}月`,
  prevYearYm: `${CY - 1}年${CM}月`,
  prevMonthYm: `${PREV_M.y}年${PREV_M.m}月`,
  m: `${CM}月`,
  range: `1-${CM}月`,
  rangeJa: `1〜${CM}月`,
};
const COUNTRY_FLAGS = {
  '韓国': '🇰🇷', '中国': '🇨🇳', '台湾': '🇹🇼', '香港': '🇭🇰',
  'タイ': '🇹🇭', 'シンガポール': '🇸🇬', 'マレーシア': '🇲🇾', 'インドネシア': '🇮🇩',
  'フィリピン': '🇵🇭', 'ベトナム': '🇻🇳', 'インド': '🇮🇳', '豪州': '🇦🇺',
  '米国': '🇺🇸', 'カナダ': '🇨🇦', 'メキシコ': '🇲🇽', '英国': '🇬🇧',
  'フランス': '🇫🇷', 'ドイツ': '🇩🇪', 'イタリア': '🇮🇹', 'スペイン': '🇪🇸',
  'ロシア': '🇷🇺', '北欧地域': '🇸🇪', '中東地域': '🇦🇪', 'その他': '🌐'
};
const COUNTRY_COLORS = [
  '#1a1a1a', '#333333', '#4a4a4a', '#666666', '#808080',
  '#999999', '#b3b3b3', '#cccccc', '#e0e0e0', '#f0f0f0'
];
// 国・地域の色 — 市場レポート（PDF・編集用PPT）・Webの宿泊マップ・旅行消費額ダッシュボードと共通。
// 変えるときは全部そろえて変える（inbound-report-kit の CC と同じ値）
const COUNTRY_PIE_COLORS = {
  '韓国': '#2f6db5', '中国': '#c0463f', '台湾': '#2f8f5b', '香港': '#8a4fb0', '米国': '#1f7f8f', 'タイ': '#d27a1f',
  'マレーシア': '#a88a12', 'インドネシア': '#a0522d', 'ベトナム': '#b8467e', 'シンガポール': '#5b8c3a', 'フィリピン': '#6d5a8e',
  '豪州': '#3f6f9e', 'カナダ': '#9b6b43', '英国': '#4a5a7a', 'フランス': '#7a8fb0', 'ドイツ': '#5a5a5a', 'イタリア': '#4f8a7a', 'スペイン': '#b07a3a',
  'インド': '#d98c5f', 'ロシア': '#5e3c6d', 'メキシコ': '#8a9a2f', '中東地域': '#9a7b4f', '北欧地域': '#6c8a99',
  'その他': '#c9d0db',
};
const COUNTRY_ALIAS = { 'オーストラリア': '豪州', '中東': '中東地域', '北欧': '北欧地域' };
const colorOf = (name) => COUNTRY_PIE_COLORS[COUNTRY_ALIAS[name] || name] || '#9aa3b2';
const YEAR_COLORS = {
  '2026': '#e53935',  // 레드 (현재 강조)
  '2025': '#1a1a1a',  // 블랙 (최신 완료 연도)
  '2024': '#546e7a',  // 블루그레이 (구별 가능)
  '2023': '#90a4ae',  // 라이트 블루그레이
  '2019': '#ff8f00',  // 앰버/오렌지 (코로나 전 비교 강조)
};
const PHASE_COLORS = {
  '初期成長期': '#b0bec5',    // 블루그레이 라이트
  '本格成長期': '#78909c',    // 블루그레이 미디엄
  'ピーク期': '#455a64',      // 블루그레이 다크
  'コロナ影響期': '#ef5350',  // 레드 (특별 강조)
  '回復・成長期': '#1a1a1a'   // 블랙 (최신)
};
// ============================================================
// 유틸리티
// ============================================================
const parseNumber = (str) => {
  if (!str) return 0;
  return parseFloat(String(str).replace(/,/g, '').trim()) || 0;
};
const formatNum = (num, dec = 1) => {
  if (!num || isNaN(num)) return '—';
  return num.toLocaleString('ja-JP', { maximumFractionDigits: dec });
};
const formatMan = (num) => num ? formatNum(num / 10000, 1) + '万' : '—';
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const fetchSheet = async (name, retries = 2) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(name)}?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (res.status === 429 && retries > 0) { await delay(1000); return fetchSheet(name, retries - 1); }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).values || [];
  } catch (e) { console.error(`Error ${name}:`, e); return []; }
};
// ============================================================
// ⭐ JNTO年シートのパーサ
//   「1月」を含む行を見出しとして月列・累計列を特定（年によって列位置が違うため）
//   A列の国名のみ採用（B列の内訳行は無視）。その他＝総数−23市場
// ============================================================
const parseJnto = (rows) => {
  const out = {};
  let hdr = null;
  for (const r of rows || []) {
    const cells = (r || []).map(v => String(v ?? '').trim());
    if (!hdr) {
      if (cells.includes('1月')) {
        hdr = {};
        cells.forEach((v, i) => {
          const m = v.match(/^(\d{1,2})月$/);
          if (m) hdr[Number(m[1])] = i;
          if (v === '累計') hdr.total = i;
        });
      }
      continue;
    }
    const name = cells[0];
    if (!name || out[name] || name.startsWith('注') || name.startsWith('＊')) continue;
    const rec = {};
    Object.entries(hdr).forEach(([k, i]) => {
      const raw = cells[i];
      if (raw === '' || raw === undefined) return;
      const v = parseNumber(raw);
      if (Number.isFinite(v)) rec[k] = v;
    });
    out[name] = rec;
  }
  if (out['総数']) {
    const oth = {};
    Object.keys(out['総数']).forEach(k => {
      oth[k] = out['総数'][k] - JNTO_MARKETS.reduce((s, n) => s + ((out[n] || {})[k] || 0), 0);
    });
    out['その他'] = oth;
  }
  return out;
};
// ============================================================
// ⭐ iframe 높이 훅 - rootRef 기반, debounce, 초기 재전송
// ============================================================
const useIframeHeight = (rootRef, ...deps) => {
  useEffect(() => {
    let timeoutId;
    let lastSent = 0;
    const sendHeight = () => {
      if (!rootRef.current) return;
      const h = Math.ceil(rootRef.current.getBoundingClientRect().height);
      if (h <= 0) return;
      lastSent = h;
      window.parent.postMessage({
        type: 'setHeight',
        source: 'visitor-dashboard',
        height: h,
      }, '*');
    };
    const debouncedSend = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        requestAnimationFrame(sendHeight);
      }, 80);
    };
    // 초기 레이아웃 안정화를 위한 여러 시점 재전송
    const t1 = setTimeout(sendHeight, 100);
    const t2 = setTimeout(sendHeight, 400);
    const t3 = setTimeout(sendHeight, 900);
    // ResizeObserver - 컨텐츠 크기 변화 감지
    let ro = null;
    if (rootRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(debouncedSend);
      ro.observe(rootRef.current);
    }
    // WordPress에서 높이 요청하면 즉시 응답
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'requestHeight') {
        sendHeight();
      }
    };
    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', debouncedSend);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('resize', debouncedSend);
      if (ro) ro.disconnect();
    };
  }, deps);
};
// ============================================================
// 공통 컴포넌트
// ============================================================
const SectionHeader = ({ number, title, subtitle }) => (
  <div style={styles.sectionHeader}>
    {number && <p style={styles.sectionNumber}>図{parseInt(number, 10)}<span style={{ fontWeight: 400, color: '#777', marginLeft: 10, paddingLeft: 10, borderLeft: '1px solid #ddd' }}>出典：JNTO「訪日外客統計」</span></p>}
    <h2 style={styles.sectionTitle}>{title}</h2>
    {subtitle && <p style={styles.sectionDesc}>{subtitle}</p>}
  </div>
);
const ChartTooltip = ({ active, payload, label, suffix = '万人' }) => {
  if (!active || !payload) return null;
  return (
    <div style={styles.tooltip}>
      <p style={styles.tooltipTitle}>{label}</p>
      {payload.filter(p => p.value != null).map((p, i) => (
        <p key={i} style={{ fontSize: 13, margin: '4px 0', color: p.color || '#475569', fontWeight: 600 }}>
          {p.name || p.dataKey}: {formatNum(p.value)}{suffix}
        </p>
      ))}
    </div>
  );
};
// ============================================================
// ⭐ 市場別 前年同月比 다이버징 바
//    상승 = 다크그레이(#455a64) / 하락 = 레드(#dc2626, 하단 비교테이블과 동일 의미)
//    countryData({name,value,yoy})를 yoy 내림차순 정렬 → 매월 자동 갱신
// ============================================================
const DIVERGE_POS = '#455a64';
const DIVERGE_NEG = '#dc2626';
const MarketDivergingBar = ({ countryData }) => {
  const data = useMemo(() => {
    if (!countryData?.length) return [];
    return countryData
      .filter(c => Number.isFinite(c.yoy) && c.name !== '総数' && c.name !== 'その他')
      .slice()
      .sort((a, b) => b.yoy - a.yoy);
  }, [countryData]);
  if (!data.length) return null;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.yoy)), 1);
  const posCount = data.filter(d => d.yoy >= 0).length;
  const negCount = data.length - posCount;
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', marginBottom: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: DIVERGE_POS }} />
          上昇 {posCount}市場
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: DIVERGE_NEG }} />
          下落 {negCount}市場
        </span>
      </div>
      <div>
        {data.map((d) => {
          const w = Math.abs(d.yoy) / maxAbs * 100;
          const neg = d.yoy < 0;
          return (
            <div key={d.name} style={{
              display: 'grid',
              gridTemplateColumns: '104px 1fr 1fr 58px',
              alignItems: 'center',
              padding: '5px 0',
              borderBottom: '1px solid #f4f4f4',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.name}
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderRight: '1px solid #d0d0d0' }}>
                {neg && <div style={{ width: `${w}%`, height: 13, background: DIVERGE_NEG, borderRadius: '2px 0 0 2px' }} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                {!neg && <div style={{ width: `${w}%`, height: 13, background: DIVERGE_POS, borderRadius: '0 2px 2px 0' }} />}
              </div>
              <span style={{ textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: neg ? DIVERGE_NEG : '#455a64' }}>
                {d.yoy >= 0 ? '+' : ''}{d.yoy.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// ============================================================
// ⭐ 国・地域別 파이 (시계방향) + 비교 테이블
// ============================================================
const PieHoverTooltip = ({ active, payload, total }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const pct = total ? (d.value / total) * 100 : 0;
  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: 3,
      fontSize: 12,
      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
      pointerEvents: 'none',
      fontFamily: '"Noto Sans JP", sans-serif',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{d.name}</div>
      <div style={{
        fontSize: 20, fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
      }}>
        {formatNum(d.value / 10000, 1)}
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginLeft: 3, fontWeight: 500 }}>万人</span>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
        構成比 {pct.toFixed(1)}%
      </div>
    </div>
  );
};
const CountryPie = ({ data, total, label, topN = 15 }) => {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    const filtered = data.filter(c => c.value > 0).sort((a, b) => b.value - a.value);
    const top = filtered.slice(0, topN);
    const rest = filtered.slice(topN);
    const restSum = rest.reduce((s, c) => s + c.value, 0);
    const arr = top.map(c => ({ name: c.name, value: c.value, color: colorOf(c.name) }));
    if (restSum > 0) arr.push({ name: 'その他', value: restSum, color: colorOf('その他') });
    return arr;
  }, [data, topN]);
  if (!chartData.length) return null;
  // 상위 5개 세그먼트 안에 국가명 + 인수 + %
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percent, index }) => {
    if (index >= 5) return null;
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <g>
        <text x={x} y={y - 12} textAnchor="middle"
              style={{ fontSize: 12, fontWeight: 700, fill: '#fff',
                       fontFamily: '"Noto Sans JP", sans-serif',
                       paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.2)', strokeWidth: 0.6 }}>
          {name}
        </text>
        <text x={x} y={y + 2} textAnchor="middle"
              style={{ fontSize: 13, fontWeight: 700, fill: '#fff',
                       fontFamily: 'Inter, sans-serif',
                       paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.2)', strokeWidth: 0.6 }}>
          {formatNum(value / 10000, 1)}万
        </text>
        <text x={x} y={y + 15} textAnchor="middle"
              style={{ fontSize: 13, fontWeight: 600, fill: 'rgba(255,255,255,0.9)',
                       fontFamily: 'Inter, sans-serif' }}>
          {(percent * 100).toFixed(1)}%
        </text>
      </g>
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: '#b0b0b0', marginTop: 6, letterSpacing: '0.05em' }}>
          セグメントにカーソルを合わせると詳細表示
        </div>
      </div>
      <div className="pie-box" style={{ position: 'relative', width: '100%', height: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={chartData}
              cx="50%" cy="50%"
              innerRadius="46%"
              outerRadius="85%"
              paddingAngle={0.5}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
              isAnimationActive={false}
            >
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.color} stroke="#fff" strokeWidth={1.5} />
              ))}
            </Pie>
            <Tooltip content={<PieHoverTooltip total={total} />}
                     cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                     wrapperStyle={{ outline: 'none' }} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 12, color: '#666', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            総数
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#1a1a1a',
                        fontFamily: 'Inter, sans-serif', marginTop: 4, lineHeight: 1,
                        letterSpacing: '-0.02em' }}>
            {formatNum(total / 10000, 0)}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>万人</div>
        </div>
      </div>
    </div>
  );
};
const CountryComparisonTable = ({ data, total, currentLabel = '6月' }) => {
  const [expanded, setExpanded] = useState(false);
  const INITIAL = 10;
  const sorted = useMemo(() => {
    if (!data?.length) return [];
    return [...data].filter(c => c.value > 0).sort((a, b) => b.value - a.value);
  }, [data]);
  if (!sorted.length) return null;
  const visible = expanded ? sorted : sorted.slice(0, INITIAL);
  const hidden = Math.max(0, sorted.length - INITIAL);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#666',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        marginBottom: 4,
      }}>
        前年同月比較
      </div>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '12px minmax(80px, 1.1fr) 72px 60px 70px',
        gap: 10, alignItems: 'center',
        fontSize: 12, fontWeight: 600, color: '#666',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        paddingBottom: 10,
        borderBottom: '2px solid #1a1a1a',
        marginTop: 8,
      }}>
        <span></span>
        <span>国・地域</span>
        <span style={{ textAlign: 'right' }}>{currentLabel}</span>
        <span style={{ textAlign: 'right' }}>構成比</span>
        <span style={{ textAlign: 'right' }}>前年比</span>
      </div>
      {/* Rows */}
      {visible.map((c, i) => {
        const pct = total ? (c.value / total) * 100 : 0;
        return (
          <div key={c.name} style={{
            display: 'grid',
            gridTemplateColumns: '12px minmax(80px, 1.1fr) 72px 60px 70px',
            gap: 10, alignItems: 'center',
            padding: '8px 0', fontSize: 12,
            borderBottom: '1px solid #f0f0f0',
          }}>
            <span style={{
              width: 10, height: 10,
              backgroundColor: colorOf(c.name),
              borderRadius: 2, display: 'inline-block',
            }} />
            <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
              {c.name}
            </span>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              color: '#1a1a1a', fontWeight: 700, textAlign: 'right',
            }}>
              {formatNum(c.value / 10000, 1)}
              <span style={{ fontSize: 12, color: '#666', marginLeft: 2, fontWeight: 500 }}>万</span>
            </span>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              color: '#1a1a1a', fontWeight: 600, textAlign: 'right',
            }}>
              {pct.toFixed(1)}%
            </span>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700, textAlign: 'right',
              color: c.yoy >= 0 ? '#059669' : '#dc2626',
            }}>
              {c.yoy >= 0 ? '+' : ''}{c.yoy.toFixed(1)}%
            </span>
          </div>
        );
      })}
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%', marginTop: 10, padding: '10px 12px',
            background: 'transparent',
            border: '1px solid #e0e0e0', borderRadius: 3,
            fontSize: 13, fontWeight: 600, color: '#333',
            fontFamily: '"Noto Sans JP", sans-serif',
            letterSpacing: '0.04em', cursor: 'pointer',
            textTransform: 'uppercase',
          }}>
          {expanded ? '折り畳む ▲' : `残り ${hidden} ヶ国を表示 ▼`}
        </button>
      )}
    </div>
  );
};
// ============================================================
// ⭐ NEW 増減の要因分解（人数ベース）
//    %ではなく「何人増えた/減ったか」で総数への寄与を示す
// ============================================================
// ============================================================
// ⭐ NEW データ区分ストリップ（確定・暫定・推計）
// ============================================================
const DataStatusStrip = ({ compact = false }) => {
  const P = Math.min(CURRENT.dataStatus.provisionalThrough, CM);
  const items = [
    { s: '確定', t: `${CURRENT.dataStatus.finalYear}年以前` },
    P > 0 && { s: '暫定', t: `${CY}年1〜${P}月` },
    P < CM && { s: '推計', t: `${CY}年${P + 1 === CM ? `${CM}月` : `${P + 1}〜${CM}月`}` },
  ].filter(Boolean);
  return (
    <div style={{ marginTop: compact ? 8 : 16, padding: compact ? 0 : '10px 14px', background: compact ? 'transparent' : '#fff',
                  border: compact ? 'none' : '1px solid #e8e8e8', borderRadius: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#666' }}>データ区分</span>
        {items.map(x => (
          <span key={x.s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#333' }}>
            <StatusChip s={x.s} /> {x.t}
          </span>
        ))}
      </div>
      {!compact && (
        <p style={{ fontSize: 13, color: '#666', margin: '6px 0 0' }}>
          JNTOの推計値・暫定値は、後日公表される暫定値・確定値で修正されます。本ダッシュボードも公表に合わせて毎月更新します。
        </p>
      )}
    </div>
  );
};
const signMan = (v, dec = 1) => `${v >= 0 ? '+' : '−'}${(Math.abs(v) / 10000).toLocaleString('ja-JP', { minimumFractionDigits: dec, maximumFractionDigits: dec })}万`;
const ContributionBars = ({ countryData, total, prevTotal }) => {
  const rows = useMemo(() => (countryData || [])
    .filter(c => c.prev > 0)
    .map(c => ({ name: c.name, diff: c.value - c.prev })), [countryData]);
  if (!rows.length) return null;
  const bars = rows.filter(r => r.name !== 'その他');
  const plus = bars.filter(r => r.diff > 0).sort((a, b) => b.diff - a.diff);
  const minus = bars.filter(r => r.diff < 0).sort((a, b) => a.diff - b.diff);
  const plusSum = rows.filter(r => r.diff > 0).reduce((s, r) => s + r.diff, 0);
  const minusSum = rows.filter(r => r.diff < 0).reduce((s, r) => s + r.diff, 0);
  const net = total && prevTotal ? total - prevTotal : plusSum + minusSum;
  const shown = [...plus.slice(0, 7), ...minus.slice(0, 5)];
  const maxAbs = Math.max(...shown.map(r => Math.abs(r.diff)), 1);
  const topNeg = minus[0];
  const topPos = plus.slice(0, 2).map(r => r.name).join('・');
  const Row = ({ r }) => {
    const w = Math.abs(r.diff) / maxAbs * 100;
    const neg = r.diff < 0;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr 1fr 76px', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f4f4f4' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.name}
        </span>
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderRight: '1px solid #d0d0d0' }}>
          {neg && <div style={{ width: `${w}%`, minWidth: 2, height: 13, background: DIVERGE_NEG, borderRadius: '2px 0 0 2px' }} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          {!neg && <div style={{ width: `${w}%`, minWidth: 2, height: 13, background: DIVERGE_POS, borderRadius: '0 2px 2px 0' }} />}
        </div>
        <span style={{ textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: neg ? DIVERGE_NEG : DIVERGE_POS }}>
          {signMan(r.diff)}
        </span>
      </div>
    );
  };
  return (
    <div>
      {topNeg && (
        <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: '0 0 16px' }}>
          <strong>{topNeg.name}</strong>の減少（<span style={{ color: DIVERGE_NEG, fontWeight: 700 }}>{signMan(topNeg.diff)}人</span>）に対し、
          {topPos}など増加市場の合計は<span style={{ fontWeight: 700 }}>{signMan(plusSum)}人</span>。
          差し引きで総数は<span style={{ fontWeight: 700, color: net >= 0 ? DIVERGE_POS : DIVERGE_NEG }}>{signMan(net)}人</span>。
        </p>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.08em', margin: '4px 0' }}>増加寄与 TOP{Math.min(7, plus.length)}</div>
      {plus.slice(0, 7).map(r => <Row key={r.name} r={r} />)}
      {minus.length > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.08em', margin: '14px 0 4px' }}>減少寄与 TOP{Math.min(5, minus.length)}</div>}
      {minus.slice(0, 5).map(r => <Row key={r.name} r={r} />)}
    </div>
  );
};
// ============================================================
// ⭐ NEW 中国を除いた実勢（月次の前年同月比推移）
// ============================================================
const ExChinaTrend = ({ series }) => {
  if (!series?.length) return null;
  const data = series.map(d => ({
    month: statusOf(CY, parseInt(d.month)) === '推計' ? `${d.month}*` : d.month,
    '総数': d.yoy != null ? +d.yoy.toFixed(1) : null,
    '中国を除く': d.exChinaYoy != null ? +d.exChinaYoy.toFixed(1) : null,
    '中国': d.chinaYoy != null ? +d.chinaYoy.toFixed(1) : null,
  }));
  const vals = data.flatMap(d => [d['総数'], d['中国を除く'], d['中国']]).filter(v => v != null);
  const lo = Math.floor(Math.min(0, ...vals) / 15) * 15;
  const hi = Math.ceil((Math.max(0, ...vals) + 3) / 15) * 15;
  const ticks = [];
  for (let t = lo; t <= hi; t += 15) ticks.push(t);
  const pctLabel = (v) => (v == null ? '' : `${v > 0 ? '+' : ''}${v}%`);
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 24, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis domain={[lo, hi]} ticks={ticks} tickFormatter={v => `${v}%`} tick={{ fontSize: 13 }} />
        <ReferenceLine y={0} stroke="#666" />
        <Tooltip content={<ChartTooltip suffix="%" />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="中国を除く" stroke="#1a1a1a" strokeWidth={3} dot={{ r: 4, fill: '#1a1a1a' }}
              label={{ position: 'top', fontSize: 13, fontWeight: 700, fill: '#1a1a1a', formatter: pctLabel }} />
        <Line type="monotone" dataKey="総数" stroke="#9e9e9e" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: '#9e9e9e' }} />
        <Line type="monotone" dataKey="中国" stroke={COUNTRY_PIE_COLORS['中国']} strokeWidth={2} dot={{ r: 3, fill: COUNTRY_PIE_COLORS['中国'] }} />
      </LineChart>
    </ResponsiveContainer>
  );
};
// ============================================================
// ⭐ NEW 市場モメンタム（累計の前年比 vs 当月の前年比）
// ============================================================
const MomentumTable = ({ rows }) => {
  const data = useMemo(() => (rows || [])
    .filter(c => c.name !== 'その他' && c.total2025 > 0 && c[L.m] > 0)
    .slice(0, 15)
    .map(c => {
      const cur = c[`${L.m}yoy`];
      const gap = cur - c.totalYoy;
      const state = gap >= 5 ? '加速' : gap <= -5 ? '減速' : '横ばい';
      return { name: c.name, ytd: c.totalYoy, cur, gap, state };
    }), [rows]);
  if (!data.length) return null;
  const chip = {
    '加速': { background: '#1a1a1a', color: '#fff', border: '1px solid #1a1a1a' },
    '減速': { background: '#fff', color: '#1a1a1a', border: '1px solid #1a1a1a' },
    '横ばい': { background: '#f0f0f0', color: '#777', border: '1px solid #e0e0e0' },
  };
  const pc = (v) => <span style={{ color: v >= 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</span>;
  const counts = ['加速', '減速', '横ばい'].map(k => `${k} ${data.filter(d => d.state === k).length}`).join(' ／ ');
  return (
    <div>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px' }}>{counts}（差が±5pt以上で判定）</p>
      <div style={styles.tableScroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thFirst }}>国・地域</th>
              <th style={styles.th}>{L.rangeJa}累計 前年比</th>
              <th style={{ ...styles.th, ...styles.thCurrent }}>{L.m} 前年比</th>
              <th style={styles.th}>差</th>
              <th style={styles.th}>判定</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.name}>
                <td style={styles.tdFirst}>{d.name}</td>
                <td style={styles.td}>{pc(d.ytd)}</td>
                <td style={{ ...styles.td, ...styles.tdCurrent }}>{pc(d.cur)}</td>
                <td style={{ ...styles.td, color: '#555' }}>{d.gap >= 0 ? '+' : ''}{d.gap.toFixed(1)}pt</td>
                <td style={styles.td}>
                  <span style={{ ...chip[d.state], fontSize: 13, fontWeight: 700, padding: '2px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                    {d.state === '加速' ? '▲ ' : d.state === '減速' ? '▼ ' : ''}{d.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {CURRENT.momentumNote && <p style={{ fontSize: 13, color: '#666', marginTop: 10 }}>※{CURRENT.momentumNote}</p>}
    </div>
  );
};
// ============================================================
// ⭐ NEW 主要市場 月別テーブル（人数 / 前年比ヒート 切替）
// ============================================================
const heatBg = (v) => {
  if (!Number.isFinite(v)) return 'transparent';
  const a = Math.min(Math.abs(v) / 60, 1) * 0.32 + 0.04;
  return v >= 0 ? `rgba(69,90,100,${a.toFixed(2)})` : `rgba(220,38,38,${a.toFixed(2)})`;
};
const MonthlyMarketTable = ({ rows }) => {
  const [view, setView] = useState('num');
  const btn = (id, label) => (
    <button key={id} onClick={() => setView(id)} style={{
      padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: '1px solid #1a1a1a', background: view === id ? '#1a1a1a' : '#fff',
      color: view === id ? '#fff' : '#1a1a1a', borderRadius: id === 'num' ? '4px 0 0 4px' : '0 4px 4px 0',
    }}>{label}</button>
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        {btn('num', '人数（万人）')}{btn('yoy', '前年同月比（%）')}
      </div>
      <div style={styles.tableScroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thFirst }}>国・地域</th>
              {MONTHS.map(m => (
                <th key={m} style={{ ...styles.th, ...(m === CM ? styles.thCurrent : {}) }}>
                  {m}月
                  <div style={{ fontSize: 13, fontWeight: 600, color: m === CM ? 'inherit' : statusOf(CY, m) === '推計' ? '#c2410c' : '#666', opacity: m === CM ? 0.8 : 1, fontStyle: statusOf(CY, m) === '推計' ? 'italic' : 'normal' }}>
                    {statusOf(CY, m)}
                  </div>
                </th>
              ))}
              <th style={styles.th}>累計</th>
              <th style={styles.th}>前年比</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(c => c.name !== 'その他').slice(0, 10).map(c => (
              <tr key={c.name}>
                <td style={styles.tdFirst}>{c.name}</td>
                {MONTHS.map(m => {
                  const cur = { ...(m === CM ? styles.tdCurrent : {}), ...(statusOf(CY, m) === '推計' ? { fontStyle: 'italic' } : {}) };
                  if (view === 'num') {
                    return <td key={m} style={{ ...styles.td, ...cur }}>{formatNum((c[`${m}月`] || 0) / 10000, 1)}</td>;
                  }
                  const v = c[`${m}月yoy`];
                  const ok = Number.isFinite(v) && (c[`${m}月prev`] || 0) > 0;
                  return (
                    <td key={m} style={{ ...styles.td, ...cur, background: ok ? heatBg(v) : 'transparent', color: !ok ? '#777' : v >= 0 ? '#263238' : '#b91c1c', fontWeight: 600 }}>
                      {ok ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}` : '—'}
                    </td>
                  );
                })}
                <td style={{ ...styles.td, fontWeight: 700 }}>{formatNum(c.total2026 / 10000, 1)}</td>
                <td style={{ ...styles.td, color: c.totalYoy >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                  {c.totalYoy >= 0 ? '+' : ''}{c.totalYoy.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view === 'yoy' && <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>色の濃さ＝増減幅（グレー＝増加／レッド＝減少）</p>}
    </div>
  );
};
const fmtPct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;
const Num = ({ v }) => (
  <b style={{ whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', fontSize: '1.15em', color: v < 0 ? '#c62828' : '#111' }}>{fmtPct(v)}</b>
);
// ヒーロー右：月別 訪日外客数（今年＝濃い棒／前年＝薄い棒、最新月に数値）
const YearBarChart = ({ data }) => {
  const [hov, setHov] = useState(null);
  const [W, setW] = useState(640);
  const box = useRef(null);
  useEffect(() => {
    if (!box.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    setW(Math.max(280, Math.round(box.current.getBoundingClientRect().width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  if (!data?.length) return null;
  const sp = W < 480;
  const H = sp ? 250 : 310, pl = 40, pr = 4, pt = 58, pb = 28;
  const max = Math.max(...data.map(d => Math.max(d.cur, d.prev)));
  const top = Math.ceil(max / 1e6) * 1e6;
  const y = v => pt + (H - pt - pb) * (1 - v / top);
  const gw = (W - pl - pr) / 12, bw = gw * 0.34;
  const ticks = Array.from({ length: top / 1e6 + 1 }, (_, i) => i * 1e6);
  const active = hov ?? CM;
  const a = data[active - 1];
  return (
    <div ref={box} style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>月別の訪日外客数</p>
        <p style={{ fontSize: 14, color: '#333', margin: 0, display: 'flex', gap: 16 }}>
          <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#1a1a1a', marginRight: 6, verticalAlign: -1 }} />{CY}年</span>
          <span><i style={{ display: 'inline-block', width: 12, height: 12, background: '#c4c4c4', marginRight: 6, verticalAlign: -1 }} />{CY - 1}年</span>
        </p>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', marginTop: 6, maxWidth: '100%' }} onMouseLeave={() => setHov(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#1a1a1a' : '#e2e2e2'} />
            <text x={pl - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#555">{t / 1e4}{t === top ? '万' : ''}</text>
          </g>
        ))}
        {data.map(d => {
          const x0 = pl + gw * (d.m - 1) + (gw - bw * 2 - 2) / 2;
          const on = d.m === active;
          return (
            <g key={d.m} onMouseEnter={() => setHov(d.m)} style={{ cursor: 'default' }}>
              <rect x={pl + gw * (d.m - 1)} y={pt} width={gw} height={H - pt - pb} fill={on ? '#ececec' : 'transparent'} />
              <rect x={x0} y={y(d.prev)} width={bw} height={y(0) - y(d.prev)} fill="#c4c4c4" />
              {d.cur > 0 && <rect x={x0 + bw + 2} y={y(d.cur)} width={bw} height={y(0) - y(d.cur)} fill="#1a1a1a" />}
              <text x={pl + gw * (d.m - 0.5)} y={H - 10} textAnchor="middle" fontSize={sp ? 11 : 13} fontWeight={on ? 700 : 400} fill={on ? '#111' : '#555'}>{sp ? d.m : `${d.m}月`}</text>
            </g>
          );
        })}
        {a && (() => {
          const cx = pl + gw * (a.m - 0.5);
          const v = a.cur || a.prev;
          const tx = Math.min(Math.max(cx, pl + 75), W - pr - 75);
          return (
            <g pointerEvents="none">
              <line x1={cx} x2={cx} y1={40} y2={y(Math.max(a.cur, a.prev)) - 3} stroke="#111" strokeWidth="1" />
              <text x={tx} y={16} textAnchor="middle" fontSize="15" fontWeight="700" fill="#111">
                {a.m}月 {a.cur > 0 ? `${formatNum(a.cur / 1e4, 1)}万人` : `${CY}年は未公表`}
              </text>
              <text x={tx} y={34} textAnchor="middle" fontSize="12.5" fill="#333">
                前年 {formatNum(a.prev / 1e4, 1)}万{a.cur > 0 && a.prev > 0 ? `（${fmtPct((a.cur - a.prev) / a.prev * 100)}）` : ''}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
// ============================================================
// 図1 右：市場別 人数（今年＝市場色／前年＝グレー）＋前年比
// ============================================================
const ShareBars = ({ data, topN = 10 }) => {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => (data || []).filter(c => c.value > 0 && c.name !== 'その他').sort((a, b) => b.value - a.value), [data]);
  if (!rows.length) return null;
  const list = open ? rows : rows.slice(0, topN);
  const max = Math.max(...rows.map(r => Math.max(r.value, r.prev || 0)));
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#333', marginBottom: 10, flexWrap: 'wrap' }}>
        <span>太い棒＝{L.ym}（市場の色）</span>
        <span><i style={{ display: 'inline-block', width: 14, height: 4, background: '#bdbdbd', marginRight: 6, verticalAlign: 3 }} />細い棒＝{L.prevYearYm}</span>
      </div>
      {list.map(r => (
        <div key={r.name} className="sb-row" style={{ display: 'grid', gridTemplateColumns: '92px 1fr 112px', alignItems: 'center', columnGap: 10, padding: '7px 0', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
          <div>
            <div style={{ height: 12, width: `${r.value / max * 100}%`, background: colorOf(r.name) }} />
            <div style={{ height: 4, width: `${(r.prev || 0) / max * 100}%`, background: '#bdbdbd', marginTop: 3 }} />
          </div>
          <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <b style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#111' }}>{formatNum(r.value / 1e4, 1)}</b><span style={{ fontSize: 12, color: '#444' }}>万</span>
            <b style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, marginLeft: 8, color: r.yoy < 0 ? '#c62828' : '#111' }}>{fmtPct(r.yoy)}</b>
          </span>
        </div>
      ))}
      {rows.length > topN && (
        <button onClick={() => setOpen(!open)} style={{ marginTop: 12, width: '100%', padding: '10px', fontSize: 14, fontWeight: 700, color: '#1a1a1a', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>
          {open ? '上位10市場に戻す' : `残り${rows.length - topN}市場を表示`}
        </button>
      )}
    </div>
  );
};
// ============================================================
// 図4 市場モメンタム：○＝1〜N月累計の前年比 → ●＝当月の前年比
// ============================================================
const MomentumArrows = ({ rows }) => {
  const data = useMemo(() => (rows || [])
    .filter(c => c.name !== 'その他' && c.total2025 > 0 && c[L.m] > 0 && c[`${L.m}prev`] > 0)
    .map(c => ({ name: c.name, ytd: c.totalYoy, cur: c[`${L.m}yoy`] }))
    .sort((a, b) => b.cur - a.cur), [rows]);
  if (!data.length) return null;
  const vals = data.flatMap(d => [d.ytd, d.cur]);
  const lo = Math.floor(Math.min(0, ...vals) / 20) * 20, hi = Math.ceil(Math.max(0, ...vals) / 20) * 20;
  const x = v => (v - lo) / (hi - lo) * 100;
  const ticks = []; for (let t = lo; t <= hi; t += 20) ticks.push(t);
  const up = data.filter(d => d.cur - d.ytd >= 5).length, down = data.filter(d => d.cur - d.ytd <= -5).length;
  return (
    <div>
      <p style={{ fontSize: 15, color: '#222', margin: '0 0 6px', lineHeight: 1.8 }}>
        {L.m}の前年比が{L.rangeJa}累計を5pt以上上回った市場は<b>{up}</b>、下回った市場は<b>{down}</b>。
      </p>
      <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#333', margin: '0 0 12px', flexWrap: 'wrap' }}>
        <span><svg width="12" height="12" style={{ verticalAlign: -1, marginRight: 6 }}><circle cx="6" cy="6" r="5" fill="#fff" stroke="#555" strokeWidth="1.5" /></svg>{L.rangeJa}累計の前年比</span>
        <span><svg width="12" height="12" style={{ verticalAlign: -1, marginRight: 6 }}><circle cx="6" cy="6" r="5.5" fill="#1a1a1a" /></svg>{L.m}単月の前年比</span>
      </div>
      <div className="mo-grid" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px', columnGap: 10 }}>
        <span />
        <div style={{ position: 'relative', height: 20 }}>
          {ticks.map(t => <span key={t} className={t % 40 ? 'mo-tk' : ''} style={{ position: 'absolute', left: `${x(t)}%`, transform: 'translateX(-50%)', fontSize: 12, color: '#555' }}>{t > 0 ? '+' : ''}{t}%</span>)}
        </div>
        <span />
        {data.map(d => {
          const a = x(d.ytd), b = x(d.cur);
          const col = d.cur < 0 ? '#c62828' : '#1a1a1a';
          return (
            <React.Fragment key={d.name}>
              <span className="mo-nm" style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', padding: '6px 0', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{d.name}</span>
              <div style={{ position: 'relative', borderBottom: '1px solid #eee' }}>
                {ticks.map(t => <div key={t} style={{ position: 'absolute', left: `${x(t)}%`, top: 0, bottom: 0, width: 1, background: t === 0 ? '#888' : '#ececec' }} />)}
                <div style={{ position: 'absolute', top: '50%', left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%`, height: 2, marginTop: -1, background: '#9e9e9e' }} />
                <div title={`累計 ${fmtPct(d.ytd)}`} style={{ position: 'absolute', top: '50%', left: `${a}%`, width: 10, height: 10, margin: '-5px 0 0 -5px', borderRadius: '50%', background: '#fff', border: '1.5px solid #555', boxSizing: 'border-box' }} />
                <div title={`${L.m} ${fmtPct(d.cur)}`} style={{ position: 'absolute', top: '50%', left: `${b}%`, width: 12, height: 12, margin: '-6px 0 0 -6px', borderRadius: '50%', background: col }} />
              </div>
              <span style={{ textAlign: 'right', padding: '6px 0', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                <b style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: col }}>{fmtPct(d.cur)}</b>
                <span className="mo-sub" style={{ fontSize: 12, color: '#555', marginLeft: 6 }}>累計{fmtPct(d.ytd)}</span>
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {CURRENT.momentumNote && <p style={{ fontSize: 13, color: '#555', marginTop: 12 }}>※{CURRENT.momentumNote}</p>}
    </div>
  );
};
// ============================================================
// 図5 主要市場の月別推移：市場ごとの小さな棒グラフ（今年＝市場色／前年＝グレー）
// ============================================================
const MarketMultiples = ({ rows, n = 10 }) => {
  const data = useMemo(() => (rows || []).filter(c => c.name !== 'その他' && c.total2026 > 0).slice(0, n), [rows, n]);
  if (!data.length) return null;
  const W = 240, H = 92, gw = W / 12, bw = gw * 0.62;
  return (
    <div>
      <p style={{ fontSize: 13, color: '#333', margin: '0 0 14px' }}>
        色の棒＝{CY}年
        <i style={{ display: 'inline-block', width: 12, height: 12, background: '#dcdcdc', margin: '0 6px 0 16px', verticalAlign: -1 }} />{CY - 1}年
        <span style={{ marginLeft: 16, color: '#555' }}>縦の目盛りは市場ごとに異なります</span>
      </p>
      <div className="mm-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '24px 24px' }}>
        {data.map(c => {
          const vals = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, cur: c[`${i + 1}月`] || 0, prev: c[`${i + 1}月prev`] || 0 }));
          const max = Math.max(...vals.map(v => Math.max(v.cur, v.prev)), 1);
          return (
            <div key={c.name} style={{ borderTop: '2px solid #1a1a1a', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <b style={{ fontSize: 15, color: '#111' }}>{c.name}</b>
                <b style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: c.totalYoy < 0 ? '#c62828' : '#111' }}>{fmtPct(c.totalYoy)}</b>
              </div>
              <p style={{ fontSize: 13, color: '#333', margin: '2px 0 6px' }}>{L.rangeJa}累計 {formatNum(c.total2026 / 1e4, 1)}万人</p>
              <svg viewBox={`0 0 ${W} ${H + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                {vals.map(v => {
                  const x0 = gw * (v.m - 1) + (gw - bw) / 2;
                  return (
                    <g key={v.m}>
                      <title>{`${v.m}月 ${CY}年 ${formatNum(v.cur / 1e4, 1)}万 ／ ${CY - 1}年 ${formatNum(v.prev / 1e4, 1)}万`}</title>
                      <rect x={x0} y={H - v.prev / max * H} width={bw} height={v.prev / max * H} fill="#dcdcdc" />
                      {v.cur > 0 && <rect x={x0 + bw * 0.22} y={H - v.cur / max * H} width={bw * 0.56} height={v.cur / max * H} fill={colorOf(c.name)} />}
                    </g>
                  );
                })}
                <line x1="0" x2={W} y1={H} y2={H} stroke="#1a1a1a" />
              </svg>
              <div style={{ position: 'relative', height: 18, fontSize: 12, color: '#444' }}>
                {[1, CM, 12].map(m => <span key={m} style={{ position: 'absolute', left: `${(m - 0.5) / 12 * 100}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{m}月</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// ヒーロー下の出典・データ区分（1段落の注記。チップ・バッジは使わない）
const HeroNote = () => {
  const { pub, next } = releaseInfo();
  const [ny, nm] = next ? next.ym.split('-').map(Number) : [];
  return (
    <p style={{ fontSize: 13, lineHeight: 1.8, color: '#555', margin: '20px 0 0' }}>
      出典：JNTO「訪日外客統計」{pub && `（${jaDate(pub.date)}公表）`}。
      {CURRENT.dataStatus.finalYear}年以前は確定値、{rangeStatusText()}で、後日の公表に合わせて修正します。
      次回更新：{next ? `${ny}年${nm}月分（${jaDate(next.date, false)}予定）` : '毎月中旬'}
    </p>
  );
};
// ============================================================
// 탭1: 最新月間
// ============================================================
const TabMonthly = ({ monthlyData, countryData, countryTotal, countryMonthlyData, trendData, specialData, monthlySeries, ytd, yearBars }) => {
  if (!monthlyData || monthlyData.length === 0) return <p>データ読み込み中...</p>;

  const latest = monthlyData[0];
  const yoy = parseFloat(latest.yoy) || 0;
  const mom = parseFloat(latest.mom) || 0;
  // 월별 추이 차트 데이터 - 2017/2018 제거
  const years = ['2026', '2025', '2024', '2023', '2019'];
  const chartData = [];
  for (let m = 1; m <= 12; m++) {
    const row = { month: `${m}月` };
    years.forEach(year => {
      const found = trendData.find(d => d.month === m && d.year === year + '年');
      if (found?.value > 0) row[year] = found.value / 10000;
    });
    chartData.push(row);
  }
  // 中国を除く成長率 (⭐ 중국 제외 필터 - 기존 버그 수정)
  const exChina = countryData.filter(c => c.name !== '中国');
  const totalExChina = exChina.reduce((s, c) => s + c.value, 0);
  const totalExChinaPrev = exChina.reduce((s, c) => {
    // シートの前年値を優先、無ければ yoy から逆算
    const prev = c.prev > 0 ? c.prev : (c.yoy !== -100 ? c.value / (1 + c.yoy / 100) : 0);
    return s + prev;
  }, 0);
  const yoyExChina = totalExChinaPrev > 0
    ? ((totalExChina - totalExChinaPrev) / totalExChinaPrev * 100)
    : 0;
  const prevTotal = countryData.reduce((s, c) => s + (c.prev || 0), 0);
  const singles = CURRENT.singleMonthRecords || [];
  return (
    <>
      {/* Hero — 左：数字と文章／右：月別棒グラフ（今年と前年） */}
      <section style={styles.hero}>
        <div className="gh-top" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', columnGap: 48, alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>{L.ym}の訪日外客数</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.01em', color: '#111' }}>{formatNum(latest.total / 10000, 1)}</span>
              <span style={{ fontSize: 22, fontWeight: 500, color: '#333' }}>万人</span>
            </div>
            <div style={{ fontSize: 17, lineHeight: 2, color: '#222', marginTop: 14 }}>
              <div>前年同月比 <Num v={yoy} /><span style={{ fontSize: 15, color: '#444', marginLeft: 6 }}>（{L.prevYearYm} {formatMan(latest.prevYear)}人）</span></div>
              <div>前月比 <Num v={mom} /><span style={{ fontSize: 15, color: '#444', marginLeft: 6 }}>（{L.prevMonthYm} {formatMan(latest.prevMonth)}人）</span></div>
              <div>中国を除く市場の前年同月比 <Num v={yoyExChina} /></div>
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #d6d6d6', fontSize: 16, color: '#222', lineHeight: 1.8 }}>
              {L.rangeJa}の累計 <b style={{ fontFamily: 'Inter, sans-serif', fontSize: 22 }}>{formatNum(ytd.total / 10000, 1)}</b>万人
              <span style={{ marginLeft: 8 }}>前年同期比 <Num v={ytd.yoy} /></span>
            </div>
          </div>
          <YearBarChart data={yearBars} />
        </div>
        {CURRENT.recordMarkets.length > 0 && (
          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid #d6d6d6', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 16, rowGap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{L.m}として過去最高 {CURRENT.recordMarkets.length}市場</span>
            <span style={{ fontSize: 16, color: '#222' }}>
              {CURRENT.recordMarkets.map((n, i) => (
                <span key={n}>{i > 0 && '、'}{singles.includes(n) ? <b>{n}（単月過去最高）</b> : n}</span>
              ))}
            </span>
          </div>
        )}
        {specialData?.[0] && (
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#222', margin: '20px 0 0' }}>
            <b>{specialData[0].country}</b>が{formatMan(specialData[0].value)}人を記録。{specialData[0].note}
          </p>
        )}
        <HeroNote />
      </section>
      {/* 국가별 파이 + 비교 테이블 */}
      {countryData?.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="01" title="国・地域別シェア" subtitle={`${L.ym}の市場別構成比`} />
          <div style={{
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            padding: 24,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 32,
              alignItems: 'start',
            }} className="share-grid">
              <CountryPie data={countryData} total={countryTotal} label={L.ym} topN={15} />
              <ShareBars data={countryData} />
            </div>
            <p style={styles.chartSource}>出典：JNTO訪日外客統計（{L.ym}{statusOf(CY, CM)}値・前年同月は{statusOf(CY - 1, CM)}値）</p>
          </div>
        </section>
      )}
      {/* NEW 増減の要因分解 */}
      {countryData?.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="02" title="増減の要因分解" subtitle="前年同月からの増減を「人数」で分解。どの市場が総数を動かしたかを示す。" />
          <div style={styles.chartWrap}>
            <div style={styles.chartTitleInline}>
              <span>市場別 増減数（前年同月差）</span>
              <span style={styles.chartUnit}>単位: 人</span>
            </div>
            <ContributionBars countryData={countryData} total={latest.total || countryTotal} prevTotal={latest.prevYear || prevTotal} />
            <p style={styles.chartSource}>出典：JNTO訪日外客統計（{L.ym}{statusOf(CY, CM)}値・{L.prevYearYm}{statusOf(CY - 1, CM)}値）より算出。総数の増減には「その他」を含む</p>
          </div>
        </section>
      )}
      {/* NEW 中国を除いた実勢 */}
      {monthlySeries?.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="03" title="中国を除いた実勢" subtitle={`総数・中国・中国を除く市場の前年同月比（${CY}年${L.range}）。総数の弱さが中国要因かどうかを判別。`} />
          <div style={styles.chartWrap}>
            <div style={styles.chartTitleInline}>
              <span>前年同月比の推移</span>
              <span style={styles.chartUnit}>単位: %</span>
            </div>
            <ExChinaTrend series={monthlySeries} />
            <p style={styles.chartSource}>出典：JNTO訪日外客統計（{rangeStatusText()}、{CY - 1}年確定値）より算出　＊＝推計値</p>
          </div>
        </section>
      )}
      {/* NEW 市場モメンタム */}
      {countryMonthlyData?.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="04" title={`市場別 前年同月比と勢い`} subtitle={`○が${L.rangeJa}累計、●が${L.m}単月の前年比。●が右にあるほど${L.m}は勢いが強い。`} />
          <div style={styles.chartWrap}>
            <MomentumArrows rows={countryMonthlyData} />
            <p style={styles.chartSource}>出典：JNTO訪日外客統計（{rangeStatusText()}、{CY - 1}年確定値）より算出</p>
          </div>
        </section>
      )}
      {/* 국가별 1-N월 추이 + 누계 비교 */}
      {countryMonthlyData?.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="05" title={`主要市場の月別推移`} subtitle={`${L.rangeJa}累計の上位10市場。月ごとの人数を前年と重ねて表示。`} />
          <div style={styles.chartWrap}>
            <MarketMultiples rows={countryMonthlyData} />
            <p style={styles.chartSource}>出典：JNTO訪日外客統計（{rangeStatusText()}、{CY - 1}年確定値）。数値はグラフにカーソルを合わせると表示</p>
          </div>
        </section>
      )}
      {/* 월별 추이 */}
      {chartData.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="06" title="月別推移（2019-2026年）" subtitle="月ごとの訪日客数推移。4月・10月が繁忙期、2月・9月が閑散期。" />
          <div style={styles.chartWrap}>
            <div style={styles.chartTitleInline}>
              <span>訪日外客数 月別比較</span>
              <span style={styles.chartUnit}>単位: 万人</span>
            </div>
            <div style={styles.trendLegend}>
              {years.map(y => (
                <div key={y} style={{...styles.legendItem, color: YEAR_COLORS[y], fontWeight: y === '2026' || y === '2025' ? 700 : 500}}>
                  <span style={{...styles.legendDot, background: YEAR_COLORS[y], width: y === '2026' ? 12 : 16, height: y === '2026' ? 12 : 4, borderRadius: y === '2026' ? '50%' : 2}} />
                  {y}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[100, 450]} tickFormatter={v => v} label={{ value: '万人', position: 'top', offset: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                {years.slice(1).reverse().map(y => (
                  <Line key={y} type="monotone" dataKey={y} stroke={YEAR_COLORS[y]} strokeWidth={y === '2025' ? 3 : 2} dot={{ r: y === '2025' ? 5 : 3, fill: YEAR_COLORS[y] }} connectNulls />
                ))}
                <Line type="monotone" dataKey="2026" stroke={YEAR_COLORS['2026']} strokeWidth={3} dot={{ r: 8, fill: '#dc2626', strokeWidth: 3, stroke: '#fff' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <p style={styles.chartSource}>出典：JNTO ※2020-2022年はコロナ影響により除外</p>
          </div>
        </section>
      )}
    </>
  );
};
// ============================================================
// 탭2: 年間総括 - 연도별 비교 + 분기별 추이
// ============================================================
const YTD_STRIPE_BG = 'repeating-linear-gradient(45deg, #f97316 0 3px, #fde0c8 3px 7px)';
const TabAnnual = ({ annualData, trendData, countryMonthlyData, ytd }) => {
  const CYS = String(CY);
  const [selectedYear, setSelectedYear] = useState(CYS);
  if (!annualData || annualData.length === 0) return <p>データ読み込み中...</p>;
  const isYtd = selectedYear === CYS;
  // 同期間（1〜CM月）の合計: 当年・前年はJNTOタブ、それ以前は月別推移シートから算出
  const periodSum = (y) => {
    if (y === CYS && ytd?.total) return ytd.total;
    if (y === String(CY - 1) && ytd?.prev) return ytd.prev;
    return (trendData || [])
      .filter(d => d.year === `${y}年` && d.month <= CM)
      .reduce((s, d) => s + d.value, 0);
  };
  // ボタン: 当年(累計) + 2025〜2019（シートに当年行があっても重複させない）
  const availableYears = [CYS, ...annualData.map(d => d.year).filter(y => parseInt(y) >= 2019 && parseInt(y) < CY)];
  const yearData = isYtd ? null : annualData.find(d => d.year === selectedYear);
  // ---- 当年: 累計TOP5（各月シートから）----
  const ytdRank = (countryMonthlyData || []).filter(c => c.name !== 'その他' && c.total2026 > 0);
  const prevRankOrder = [...ytdRank].sort((a, b) => b.total2025 - a.total2025).map(c => c.name);
  const ytdTop5 = [...ytdRank].sort((a, b) => b.total2026 - a.total2026).slice(0, 5).map((c, i) => ({
    rank: i + 1, country: c.name, value: c.total2026, yoy: c.totalYoy,
    prevRank: prevRankOrder.indexOf(c.name) + 1,
  }));
  const top5 = isYtd ? ytdTop5 : (yearData ? [1, 2, 3, 4, 5].map(r => ({
    rank: r, country: yearData[`rank${r}`], value: yearData[`rank${r}Value`],
  })).filter(x => x.country) : []);
  const top5Total = isYtd ? (ytd?.total || 0) : (yearData?.total || 0);
  // ---- 比較チャート: 通年(薄) + 1〜CM月(濃) ----
  const comparisonYears = ['2019', '2023', '2024', '2025', CYS];
  const comparisonData = comparisonYears.map(y => {
    const row = annualData.find(d => d.year === y);
    const full = y === CYS ? null : (row ? row.total / 10000 : 0);
    const part = periodSum(y) / 10000;
    return { year: y, full, part, isCovidPre: y === '2019', isYtd: y === CYS };
  });
  const maxTotal = Math.max(...comparisonData.map(d => Math.max(d.full || 0, d.part || 0)), 1);
  const BAR_H = 180;
  const prevPart = comparisonData.find(d => d.year === String(CY - 1))?.part || 0;
  return (
    <section style={styles.section}>
      <SectionHeader title="年間訪日外客数" subtitle={`年度別の訪日外国人旅行者数と主要市場ランキング。${CY}年は${L.rangeJa}の累計（速報）。`} />
      {/* 연도 선택 */}
      <div style={styles.yearSelector}>
        {availableYears.map(y => {
          const active = selectedYear === y;
          const cur = y === CYS;
          return (
            <button key={y} onClick={() => setSelectedYear(y)} style={{
              ...styles.yearBtn, ...(active ? styles.yearBtnActive : {}),
              ...(cur && !active ? { borderColor: '#f97316', color: '#c2410c' } : {}),
            }}>
              {y}年{cur && <span style={{ fontSize: 12, marginLeft: 4, opacity: 0.85 }}>{L.range}</span>}
              <span style={{ fontSize: 13, marginLeft: 5, opacity: 0.7, fontStyle: cur ? 'italic' : 'normal' }}>
                {cur ? '暫定・推計' : statusOf(y)}
              </span>
            </button>
          );
        })}
      </div>
      {/* Hero */}
      {isYtd ? (
        <div style={styles.annualHero}>
          <p style={styles.annualLabel}>
            {CY}年 {L.rangeJa} 累計 訪日外国人旅行者数
            <span style={{ ...styles.heroBadge, marginLeft: 8, background: '#f97316' }}>速報・累計</span>
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}><DataStatusStrip compact /></div>
          <div style={styles.annualNumber}>
            <span style={styles.annualDigits}>{formatNum((ytd?.total || 0) / 10000, 0)}</span>
            <span style={styles.annualUnit}>万人</span>
          </div>
          <p style={styles.annualGrowth}>
            前年同期比 <span style={{ color: ytd?.yoy >= 0 ? '#43a047' : '#e53935', fontWeight: 700 }}>
              {ytd?.yoy >= 0 ? '+' : ''}{(ytd?.yoy || 0).toFixed(1)}%
            </span>
            {ytd?.exChinaYoy != null && (
              <span style={{ marginLeft: 16 }}>中国を除く <span style={{ color: ytd.exChinaYoy >= 0 ? '#43a047' : '#e53935', fontWeight: 700 }}>
                {ytd.exChinaYoy >= 0 ? '+' : ''}{ytd.exChinaYoy.toFixed(1)}%</span></span>
            )}
          </p>
          <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            比較：{CY - 1}年{L.rangeJa} {formatNum(prevPart, 0)}万人 ／ {CY - 1}年通年 {formatNum((annualData.find(d => d.year === String(CY - 1))?.total || 0) / 10000, 0)}万人
          </p>
        </div>
      ) : yearData && (
        <div style={styles.annualHero}>
          <p style={styles.annualLabel}>{selectedYear}年 訪日外国人旅行者数 <StatusChip s={statusOf(selectedYear)} size={11} /></p>
          <div style={styles.annualNumber}>
            <span style={styles.annualDigits}>{formatNum(yearData.total / 10000, 0)}</span>
            <span style={styles.annualUnit}>万人</span>
          </div>
          {yearData.yoy && (
            <p style={styles.annualGrowth}>
              前年比 <span style={{ color: parseFloat(yearData.yoy) >= 0 ? '#43a047' : '#e53935', fontWeight: 700 }}>
                {parseFloat(yearData.yoy) >= 0 ? '+' : ''}{yearData.yoy}%
              </span>
            </p>
          )}
        </div>
      )}
      {/* 연도별 비교 바 차트: 通年 + 同期間 */}
      <div style={styles.chartWrap}>
        <div style={styles.chartTitleInline}>
          <span>年間推移比較</span>
          <span style={styles.chartUnit}>単位: 万人</span>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#666', marginBottom: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 12, background: '#e3e7ea', border: '1px solid #cfd8dc' }} />通年
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 12, background: '#78909c' }} />うち{L.rangeJa}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 12, background: YTD_STRIPE_BG, border: '1px solid #f97316' }} />{CY}年 {L.rangeJa}累計
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, paddingTop: 36 }}>
          {comparisonData.map(d => {
            const sel = d.year === selectedYear;
            const fullH = d.full ? (d.full / maxTotal) * BAR_H : 0;
            const partH = d.part ? (d.part / maxTotal) * BAR_H : 0;
            const partColor = sel ? '#1a1a1a' : d.isCovidPre ? '#ff8f00' : '#78909c';
            return (
              <div key={d.year} onClick={() => setSelectedYear(d.year)}
                   style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                {/* バー領域（高さ固定＝ベースライン統一） */}
                <div style={{ position: 'relative', width: '100%', height: BAR_H }}>
                  {d.full != null && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: fullH,
                                  background: d.isCovidPre ? '#ffe0b2' : '#e3e7ea', border: '1px solid #cfd8dc', borderBottom: 'none', borderRadius: '4px 4px 0 0' }}>
                      <span style={{ position: 'absolute', top: -22, left: 0, right: 0, textAlign: 'center',
                                     fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: sel ? '#e53935' : '#1a1a1a' }}>
                        {formatNum(d.full, 0)}
                      </span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: d.isYtd ? 0 : '14%', right: d.isYtd ? 0 : '14%', height: partH,
                                background: d.isYtd ? YTD_STRIPE_BG : partColor,
                                border: d.isYtd ? `${sel ? 2 : 1}px solid ${sel ? '#1a1a1a' : '#f97316'}` : 'none',
                                borderBottom: 'none', borderRadius: '3px 3px 0 0',
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {d.isYtd ? (
                      <span style={{ position: 'absolute', top: -22, left: 0, right: 0, textAlign: 'center',
                                     fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: sel ? '#e53935' : '#c2410c' }}>
                        {formatNum(d.part, 0)}
                      </span>
                    ) : partH > 22 && (
                      <span style={{ marginTop: 4, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                        {formatNum(d.part, 0)}
                      </span>
                    )}
                  </div>
                </div>
                {/* ラベル領域（高さ固定） */}
                <div style={{ height: 66, textAlign: 'center', paddingTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? '#1a1a1a' : '#666' }}>{d.year}年</div>
                  {d.isCovidPre && <div style={{ fontSize: 12, color: '#ff8f00' }}>コロナ前</div>}
                  {d.isYtd && <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 700 }}>{L.range}累計</div>}
                  <div style={{ marginTop: 3 }}>
                    {d.isYtd ? <StatusChip s="推計" suffix="含む" size={9} /> : <StatusChip s={statusOf(d.year)} size={9} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={styles.chartSource}>
          ※{CY}年は{L.rangeJa}の累計（通年値ではない）。濃色は各年の同期間（{L.rangeJa}）で、同じ条件で比較可能。数値区分：{rangeStatusText()}、{CURRENT.dataStatus.finalYear}年以前は確定値。2020-2022年はコロナ影響により除外
        </p>
      </div>
      {/* TOP5 랭킹 */}
      {top5.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h4 style={styles.rankingTitle}>
            国・地域別 TOP5（{isYtd ? `${CY}年${L.rangeJa}累計` : `${selectedYear}年`}）
          </h4>
          <div style={styles.chartWrap}>
            {top5.map(({ rank, country, value, yoy, prevRank }) => {
              const barWidth = (value / top5[0].value) * 100;
              const barColors = ['#1a1a1a', '#455a64', '#607d8b', '#78909c', '#90a4ae'];
              const move = isYtd && prevRank > 0 ? prevRank - rank : 0;
              return (
                <div key={country} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: rank < top5.length ? '1px solid #e0e0e0' : 'none' }}>
                  <span style={{ width: 28, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: rank === 1 ? '#e53935' : '#666' }}>{rank}</span>
                  
                  <span style={{ width: 80, fontSize: 14, fontWeight: 600 }}>{country}</span>
                  {isYtd && (
                    <span title={`${CY - 1}年同期 ${prevRank}位`} style={{ width: 46, fontSize: 13, fontWeight: 700, color: move > 0 ? '#059669' : move < 0 ? '#dc2626' : '#777' }}>
                      {move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : '—'}
                    </span>
                  )}
                  <div style={{ flex: 1, height: 24, background: '#f0f0f0', borderRadius: 4, margin: '0 16px', overflow: 'hidden' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: barColors[rank - 1], borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 50 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'white' }}>{top5Total ? ((value / top5Total) * 100).toFixed(1) : '—'}%</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, width: 80, textAlign: 'right' }}>{formatMan(value)}</span>
                  {isYtd && (
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, width: 64, textAlign: 'right', color: yoy >= 0 ? '#059669' : '#dc2626' }}>
                      {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })}
            {isYtd && (
              <p style={styles.chartSource}>▲▼＝{CY - 1}年{L.rangeJa}の順位からの変動 ／ 右端＝前年同期比。各月シート（{rangeStatusText()}）の合算</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
// ============================================================
// 탭3: 長期推移
// ============================================================
const TabLongTerm = ({ longTermData, ytd }) => {
  if (!longTermData || longTermData.length === 0) return <p>データ読み込み中...</p>;
  const chartData = longTermData.map(d => ({
    ...d,
    totalMan: Math.round(d.total),
    label: d.year === String(CY) ? `${String(CY).slice(2)}.1-${CM}` : String(d.year).slice(2)
  }));

  // 2030년 목표 추가
  chartData.push({ year: '2030', totalMan: 6000, label: '30目標', phase: '2030年目標' });
  // 2025년 실적
  const actual2025 = 4268;
  const target2030 = 6000;
  const progressPercent = Math.round((actual2025 / target2030) * 100);
  return (
    <section style={styles.section}>
      <SectionHeader title="22年間の長期推移と2030年目標" subtitle="2003年のビジット・ジャパン事業開始から現在まで、そして観光庁が掲げる2030年目標へ" />

      {/* 2030年目標 달성도 카드 */}
      <div style={styles.targetSection}>
        <div style={styles.targetCard}>
          <p style={styles.targetLabel}>観光庁 2030年目標</p>
          <div style={styles.targetRow}>
            <div style={styles.targetItem}>
              <p style={styles.targetItemLabel}>訪日外客数</p>
              <p style={styles.targetItemValue}><span style={styles.targetCurrent}>4,268</span> <span style={styles.targetArrow}>→</span> <span style={styles.targetGoal}>6,000</span><span style={styles.targetUnit}>万人</span></p>
              <div style={styles.progressBar}>
                <div style={{...styles.progressFill, width: `${progressPercent}%`}} />
              </div>
              <p style={styles.progressText}>{progressPercent}% 達成</p>
            </div>
            <div style={styles.targetItem}>
              <p style={styles.targetItemLabel}>旅行消費額</p>
              <p style={styles.targetItemValue}><span style={styles.targetCurrent}>9.5</span> <span style={styles.targetArrow}>→</span> <span style={styles.targetGoal}>20</span><span style={styles.targetUnit}>兆円</span></p>
              <div style={styles.progressBar}>
                <div style={{...styles.progressFill, width: '47.5%', background: '#8b5cf6'}} />
              </div>
              <p style={styles.progressText}>47.5% 達成</p>
            </div>
          </div>
          <p style={styles.targetInsight}>
            <strong style={{ color: '#dc2626', fontSize: 20 }}>まだ半分。</strong>
            <span style={{ color: '#64748b' }}>インバウンド市場の成長余地は、あと倍以上。</span>
          </p>
        </div>
      </div>

      <div style={styles.chartWrap}>
        <div style={styles.chartTitleInline}>
          <span>訪日外国人数の推移（2003-2030年目標）</span>
          <span style={styles.chartUnit}>単位: 万人</span>
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData} margin={{ top: 30, right: 20, left: 20, bottom: 40 }}>
            <defs>
              <pattern id="ytdStripe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#fde0c8" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#f97316" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 6500]} tickFormatter={v => v.toLocaleString()} label={{ value: '万人', position: 'top', offset: 10 }} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              const is2030 = d.year === '2030';
              return (
                <div style={styles.tooltip}>
                  <p style={styles.tooltipTitle}>{is2030 ? '2030年目標' : d.year === String(CY) ? `${CY}年${L.range}` : `${d.year}年`}</p>
                  <p style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
                    {is2030 ? '目標: ' : ''}{d.totalMan.toLocaleString()}万人{d.year === String(CY) ? '（累計・通年値ではない）' : ''}
                  </p>
                </div>
              );
            }} />
            <Bar dataKey="totalMan" radius={[4, 4, 0, 0]}
              label={({ x, y, width, index }) => (chartData[index]?.year === String(CY) ? (
                <text x={x + width / 2} y={y - 8} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: '#c2410c' }}>
                  {L.rangeJa}累計
                </text>
              ) : null)}>
              {chartData.map((e, i) => (
                <Cell
                  key={i}
                  fill={e.year === '2030' ? '#dc2626' : e.year === String(CY) ? 'url(#ytdStripe)' : PHASE_COLORS[e.phase] || '#94a3b8'}
                  fillOpacity={e.year === '2030' ? 0.3 : 1}
                  stroke={e.year === '2030' ? '#dc2626' : e.year === String(CY) ? '#f97316' : 'none'}
                  strokeWidth={e.year === '2030' ? 2 : e.year === String(CY) ? 1.5 : 0}
                  strokeDasharray={e.year === '2030' ? '5 5' : '0'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* 범례 */}
        <div style={styles.phaseRow}>
          {Object.entries(PHASE_COLORS).map(([phase, color]) => (
            <div key={phase} style={{...styles.phaseItem, borderLeftColor: color}}>
              <p style={styles.phaseLabel}>{phase}</p>
            </div>
          ))}
          <div style={{...styles.phaseItem, borderLeftColor: '#f97316'}}>
            <p style={styles.phaseLabel}>{CY}年（{L.range}累計）</p>
          </div>
          <div style={{...styles.phaseItem, borderLeftColor: '#dc2626', borderStyle: 'dashed'}}>
            <p style={styles.phaseLabel}>2030年目標</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
          ※{CY}年は{L.rangeJa}の累計値（{formatNum((ytd?.total || 0) / 10000, 1)}万人、{rangeStatusText()}）。通年値ではないため、前年との棒の高さは比較できません。
        </p>

        <p style={styles.chartSource}>出典：JNTO訪日外客統計、観光庁「観光ビジョン実現プログラム」</p>
      </div>
      {/* 마일스톤 */}
      <div style={styles.milestoneSection}>
        <h4 style={styles.milestoneTitle}>主要マイルストーン</h4>
        <div style={styles.milestoneGrid}>
          {[
            { year: '2003', event: 'ビジット・ジャパン開始', value: 521 },
            { year: '2013', event: '1,000万人突破', value: 1036 },
            { year: '2018', event: '3,000万人突破', value: 3119 },
            { year: '2024', event: '過去最高更新', value: 3687 },
            { year: '2025', event: '4,000万人突破', value: 4268 },
          ].map(m => (
            <div key={m.year} style={styles.milestoneCard}>
              <span style={styles.milestoneYear}>{m.year}</span>
              <span style={styles.milestoneEvent}>{m.event}</span>
              <span style={styles.milestoneValue}>{m.value.toLocaleString()}万人</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
// ============================================================
// 詳細：主要15市場の年間推移（市場ごとの小さな棒グラフ＋CSV）
// ============================================================
const YearMultiples = ({ rows, years }) => {
  if (!rows?.length) return null;
  const W = 260, H = 96, n = years.length, gw = W / n, bw = gw * 0.7;
  const csv = () => {
    const head = ['国・地域', ...years.map(y => y === `${CY}年` ? `${CY}年${L.rangeJa}累計` : y)];
    const body = rows.map(r => [r.country, ...years.map(y => r[y] || '')]);
    const text = '\ufeff' + [head, ...body].map(l => l.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = `訪日外客数_国別年間_${CY}${String(CM).padStart(2, '0')}.csv`;
    a.click();
  };
  const over = rows.filter(r => (r['2025年'] || 0) > (r['2019年'] || 0)).length;
  return (
    <div style={styles.chartWrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <p style={{ fontSize: 15, color: '#222', margin: 0 }}>2025年にコロナ前（2019年）を上回った市場は <b>{rows.length}市場中{over}市場</b>。</p>
        <button onClick={csv} style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', background: '#fff', border: '1px solid #1a1a1a', borderRadius: 4, padding: '7px 14px', cursor: 'pointer' }}>数値をCSVでダウンロード</button>
      </div>
      <p style={{ fontSize: 13, color: '#333', margin: '0 0 16px' }}>
        棒＝各年の訪日客数（{years[0].replace('年', '')}〜{CY}年）　点線＝2019年の水準　白抜き＝{CY}年{L.rangeJa}累計　薄い棒＝2020・21年
      </p>
      <div className="mm-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '24px 24px' }}>
        {rows.map(r => {
          const max = Math.max(...years.map(y => r[y] || 0), 1);
          const v19 = r['2019年'] || 0, v25 = r['2025年'] || 0;
          const g = v19 > 0 ? (v25 - v19) / v19 * 100 : null;
          const col = colorOf(r.country);
          return (
            <div key={r.country} style={{ borderTop: '2px solid #1a1a1a', paddingTop: 8 }}>
              <b style={{ fontSize: 15, color: '#111', whiteSpace: 'nowrap' }}>{r.country}</b>
              <p style={{ fontSize: 13, color: '#333', margin: '2px 0 6px', lineHeight: 1.6 }}>
                2025年 {formatNum(v25 / 1e4, 1)}万人
                {g != null && <span style={{ whiteSpace: 'nowrap', display: 'inline-block', marginLeft: 6 }}>2019年比 <b style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: g < 0 ? '#c62828' : '#111' }}>{fmtPct(g)}</b></span>}
              </p>
              <svg viewBox={`0 0 ${W} ${H + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                {years.map((y, i) => {
                  const v = r[y] || 0, h = v / max * H, x0 = gw * i + (gw - bw) / 2;
                  const covid = y === '2020年' || y === '2021年', cur = y === `${CY}年`;
                  return (
                    <g key={y}>
                      <title>{`${y}${cur ? `（${L.rangeJa}累計）` : ''} ${formatNum(v / 1e4, 1)}万人`}</title>
                      <rect x={x0} y={H - h} width={bw} height={h} fill={cur ? '#fff' : col} fillOpacity={covid ? 0.3 : 1} stroke={cur ? col : 'none'} strokeWidth="1.5" />
                    </g>
                  );
                })}
                <line x1="0" x2={W} y1={H - v19 / max * H} y2={H - v19 / max * H} stroke="#1a1a1a" strokeDasharray="3 3" />
                <line x1="0" x2={W} y1={H} y2={H} stroke="#1a1a1a" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444', marginTop: 3 }}>
                <span>{years[0].replace('年', '')}</span><span>2019</span><span>{CY}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p style={styles.chartSource}>出典：JNTO訪日外客統計（{CY}年は{rangeStatusText()}）</p>
    </div>
  );
};
// ============================================================
// 탭4: 国・地域別 (완전한 테이블)
// ============================================================
const TabCountry = ({ countryYearlyData, latestCountryData }) => {
  if (!countryYearlyData || countryYearlyData.length === 0) return <p>データ読み込み中...</p>;
  const allYears = ['2014年', '2015年', '2016年', '2017年', '2018年', '2019年', '2020年', '2021年', '2022年', '2023年', '2024年', '2025年', '2026年'];
  // 성장률 계산 (2019 vs 2025)
  const growthData = countryYearlyData.slice(0, 15).map(row => {
    const v2019 = row['2019年'] || 0;
    const v2025 = row['2025年'] || 0;
    const growth = v2019 > 0 ? ((v2025 - v2019) / v2019 * 100) : 0;
    return { country: row.country, growth, v2019, v2025 };
  }).sort((a, b) => b.growth - a.growth);
  // 상위 5개국 차트 데이터 + 색상
  const top5Countries = countryYearlyData.slice(0, 5);
  const top5Colors = ['#0369a1', '#dc2626', '#059669', '#8b5cf6', '#f97316'];

  // 라인 차트용 데이터 변환
  const lineChartData = allYears.filter(y => y !== '2020年' && y !== '2021年' && y !== `${CY}年`).map(year => {
    const row = { year: year.replace('年', '') };
    top5Countries.forEach((c, i) => {
      row[c.country] = (c[year] || 0) / 10000;
    });
    return row;
  });
  return (
    <section style={styles.section}>
      <SectionHeader title="国・地域別 年間推移" subtitle={`主要15市場の年間訪日客数（2014年〜${L.ym}）。数値の一覧はCSVで取得できます。`} />

      <YearMultiples rows={countryYearlyData.slice(0, 15)} years={allYears} />
    </section>
  );
};
// ============================================================
// 메인 App
// ============================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [monthlyData, setMonthlyData] = useState([]);
  const [countryLatestData, setCountryLatestData] = useState([]);
  const [countryLatestTotal, setCountryLatestTotal] = useState(0);
  const [countryMonthlyData, setCountryMonthlyData] = useState([]); // 1-N월 국가별
  const [annualData, setAnnualData] = useState([]);
  const [longTermData, setLongTermData] = useState([]);
  const [specialData, setSpecialData] = useState([]);
  const [yearlyMonthlyData, setYearlyMonthlyData] = useState([]);
  const [countryYearlyData, setCountryYearlyData] = useState([]);
  const [monthlySeries, setMonthlySeries] = useState([]);
  const [yearBars, setYearBars] = useState([]);
  const [ytdBase, setYtdBase] = useState({ total: 0, prev: 0 });
  // ⭐ iframe 높이 측정용 root ref + 훅
  const rootRef = useRef(null);
  useIframeHeight(rootRef, activeTab, loading);
  // ⭐ body/html 스타일 초기화 - 부풀림 방지
  useEffect(() => {
    document.documentElement.style.height = 'auto';
    document.documentElement.style.minHeight = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '0';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, []);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ⭐ JNTO年シート（当年・前年）
        const [jCurRaw, jPrevRaw] = await Promise.all([fetchSheet(`JNTO_${CY}`), fetchSheet(`JNTO_${CY - 1}`)]);
        const jCur = parseJnto(jCurRaw);
        const jPrev = parseJnto(jPrevRaw);
        if (!jCurRaw.length && !jPrevRaw.length) {
          throw new Error('Googleシートに接続できません（ネットワーク・APIキーの制限を確認）');
        }
        if (!jCur['総数']?.[CM] || !jPrev['総数']?.[CM]) {
          throw new Error(`JNTO_${CY} / JNTO_${CY - 1} タブに${CM}月のデータがありません`);
        }
        const val = (src, n, m) => (src[n] || {})[m] || 0;
        const pct = (c, p) => (p > 0 ? (c - p) / p * 100 : 0);
        const names = [...JNTO_MARKETS, 'その他'];
        // ヒーロー（当月・前年同月・前月）
        const tot = val(jCur, '総数', CM);
        const totPY = val(jPrev, '総数', CM);
        const totPM = CM === 1 ? val(jPrev, '総数', 12) : val(jCur, '総数', CM - 1);
        setMonthlyData([{
          month: `${CY}-${String(CM).padStart(2, '0')}`,
          total: tot, prevYear: totPY, yoy: +pct(tot, totPY).toFixed(1),
          prevMonth: totPM, mom: +pct(tot, totPM).toFixed(1),
        }]);
        // 当月 市場別
        const countries = names
          .map(n => ({ name: n, value: val(jCur, n, CM), prev: val(jPrev, n, CM), yoy: pct(val(jCur, n, CM), val(jPrev, n, CM)) }))
          .filter(c => c.value > 0)
          .sort((a, b) => b.value - a.value);
        setCountryLatestData(countries);
        setCountryLatestTotal(tot);
        // 1〜CM月 市場別 + 総数/中国の月次系列
        const monthlyCountries = {};
        names.forEach(n => {
          const c = { name: n };
          MONTHS.forEach(m => {
            const v = val(jCur, n, m), p = val(jPrev, n, m);
            c[`${m}月`] = v;
            c[`${m}月prev`] = p;
            c[`${m}月yoy`] = pct(v, p);
          });
          c.total2026 = MONTHS.reduce((s, m) => s + c[`${m}月`], 0);
          c.total2025 = MONTHS.reduce((s, m) => s + c[`${m}月prev`], 0);
          c.totalYoy = pct(c.total2026, c.total2025);
          monthlyCountries[n] = c;
        });
        setCountryMonthlyData(Object.values(monthlyCountries).sort((a, b) => b.total2026 - a.total2026));
        const series = MONTHS.map(m => {
          const t = val(jCur, '総数', m), tp = val(jPrev, '総数', m);
          const ch = val(jCur, '中国', m), chp = val(jPrev, '中国', m);
          return {
            month: `${m}月`, total: t, prev: tp,
            exChina: t - ch, exChinaPrev: tp - chp,
            yoy: pct(t, tp),
            exChinaYoy: tp - chp > 0 ? pct(t - ch, tp - chp) : null,
            chinaYoy: chp > 0 ? pct(ch, chp) : null,
          };
        }).filter(d => d.total > 0 && d.prev > 0);
        setMonthlySeries(series);
        setYearBars(Array.from({ length: 12 }, (_, i) => ({ m: i + 1, cur: i + 1 <= CM ? val(jCur, '総数', i + 1) : 0, prev: val(jPrev, '総数', i + 1) })));
        // 累計: 当年はJNTO公式「累計」列（最新月が設定月と一致する場合）、前年は同期間の合算
        const latestInSheet = Math.max(...Object.keys(jCur['総数']).filter(k => k !== 'total').map(Number));
        if (latestInSheet !== CM) console.warn(`[JNTO] シートの最新月(${latestInSheet})と CURRENT.month(${CM}) が不一致`);
        const ytdTotal = latestInSheet === CM && jCur['総数'].total ? jCur['総数'].total : MONTHS.reduce((s, m) => s + val(jCur, '総数', m), 0);
        const ytdPrev = MONTHS.reduce((s, m) => s + val(jPrev, '総数', m), 0);
        setYtdBase({ total: ytdTotal, prev: ytdPrev });
        await delay(100);

        // 연간 데이터
        const annual = await fetchSheet('訪日_年間');
        if (annual?.length > 1) {
          setAnnualData(annual.slice(1).map(r => ({
            year: String(r[0]), total: parseNumber(r[1]), yoy: r[2],
            rank1: r[3], rank1Value: parseNumber(r[4]), rank2: r[5], rank2Value: parseNumber(r[6]),
            rank3: r[7], rank3Value: parseNumber(r[8]), rank4: r[9], rank4Value: parseNumber(r[10]),
            rank5: r[11], rank5Value: parseNumber(r[12])
          })));
        }
        await delay(100);

        // 장기 추이
        const longTerm = await fetchSheet('訪日_長期推移');
        if (longTerm?.length > 1) {
          const lt = longTerm.slice(1).map(r => ({ year: String(r[0]).trim(), total: parseNumber(r[1]), phase: r[2] })).filter(d => d.year);
          const ytdMan = Math.round(ytdTotal / 10000);
          const i = lt.findIndex(d => d.year === String(CY));
          if (i >= 0) lt[i].total = ytdMan;
          else lt.push({ year: String(CY), total: ytdMan, phase: '回復・成長期' });
          setLongTermData(lt);
        }
        await delay(100);

        // 특기사항
        const special = await fetchSheet('訪日_特記');
        if (special?.length > 1) {
          setSpecialData(special.slice(1).map(r => ({
            month: r[0], content: r[1], country: r[2], value: parseNumber(r[3]), note: r[4]
          })).filter(s => s.month === `${CY}-${String(CM).padStart(2, '0')}`));
        }
        await delay(100);
        // 월별 추이
        const yearlyMonthly = await fetchSheet('訪日_月別推移');
        if (yearlyMonthly?.length > 1) {
          const headers = yearlyMonthly[0];
          const parsed = [];
          yearlyMonthly.slice(1).forEach(r => {
            const m = parseInt(r[0]);
            if (isNaN(m)) return;
            headers.slice(1).forEach((y, i) => {
              const v = parseNumber(r[i + 1]);
              if (v > 0) parsed.push({ month: m, year: y, value: v });
            });
          });
          // 当年・前年は JNTO タブの値で置換（推計→暫定の修正を自動反映）
          const merged = parsed.filter(d => d.year !== `${CY}年` && d.year !== `${CY - 1}年`);
          [[CY, jCur], [CY - 1, jPrev]].forEach(([y, src]) => {
            for (let m = 1; m <= 12; m++) {
              const v = val(src, '総数', m);
              if (v > 0) merged.push({ month: m, year: `${y}年`, value: v });
            }
          });
          setYearlyMonthlyData(merged);
        }
        await delay(100);
        // 국가별 연간 (전체 연도)
        const countryYearly = await fetchSheet('訪日_国別年間');
        if (countryYearly?.length > 1) {
          const headers = countryYearly[0];
          const parsed = countryYearly.slice(1).map(r => {
            const obj = { country: r[0] };
            headers.slice(1).forEach((y, i) => { obj[y] = parseNumber(r[i + 1]); });
            // 当年累計・前年通年は JNTO タブから
            if (jCur[obj.country]?.total) obj[`${CY}年`] = jCur[obj.country].total;
            if (jPrev[obj.country]?.total) obj[`${CY - 1}年`] = jPrev[obj.country].total;
            return obj;
          });
          setCountryYearlyData(parsed);
        }
      } catch (err) {
        console.error(err);
        setError(`データの読み込みに失敗しました${err?.message ? `（${err.message}）` : ''}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  const ytd = useMemo(() => {
    const sum = (k) => monthlySeries.reduce((s, d) => s + (d[k] || 0), 0);
    const total = ytdBase.total || sum('total');
    const prev = ytdBase.prev || sum('prev');
    const exT = sum('exChina'), exP = sum('exChinaPrev');
    return {
      total, prev,
      yoy: prev > 0 ? (total - prev) / prev * 100 : 0,
      exChinaYoy: monthlySeries.length === CM && exP > 0 ? (exT - exP) / exP * 100 : null,
    };
  }, [monthlySeries, ytdBase]);
  const tabs = [
    { id: 'monthly', label: '最新速報' },
    { id: 'detail', label: '詳細データ' }
  ];
  return (
    <div ref={rootRef} style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          .share-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .gh-top { grid-template-columns: 1fr !important; row-gap: 20px; }
          .pie-box { height: 300px !important; }
          .sb-row { grid-template-columns: 1fr auto !important; row-gap: 4px; }
          .sb-row > div { grid-column: 1 / -1; grid-row: 2; }
          .mm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .mo-grid { grid-template-columns: 86px 1fr 62px !important; }
          .mo-grid > span:first-child, .mo-nm { font-size: 13px !important; }
          .mo-sub, .mo-tk { display: none; }
          .contrib-kpis {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...styles.navLink, ...(activeTab === tab.id ? styles.navLinkActive : {})}}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <main style={styles.main}>
        <div style={styles.mainInner}>
          {error && <div style={styles.errorBox}>{error}</div>}
          {loading ? (
            <div style={styles.loadingBox}><div style={styles.spinner} /></div>
          ) : (
            <>
              {activeTab === 'monthly' && <TabMonthly monthlyData={monthlyData} countryData={countryLatestData} countryTotal={countryLatestTotal} countryMonthlyData={countryMonthlyData} trendData={yearlyMonthlyData} specialData={specialData} monthlySeries={monthlySeries} ytd={ytd} yearBars={yearBars} />}
              {activeTab === 'detail' && (
                <>
                  <TabAnnual annualData={annualData} trendData={yearlyMonthlyData} countryMonthlyData={countryMonthlyData} ytd={ytd} />
                  <TabLongTerm longTermData={longTermData} ytd={ytd} />
                  <TabCountry countryYearlyData={countryYearlyData} latestCountryData={countryLatestData} />
                </>
              )}
            </>
          )}
        </div>
      </main>
      <footer style={styles.footer}>
        <p>出典：JNTO（日本政府観光局）訪日外客統計</p>
      </footer>
    </div>
  );
}
// ============================================================
// 스타일 - 그레이스케일 + 레드 포인트 (소비대시보드 톤)
// ============================================================
const styles = {
  // ⭐ minHeight: '100vh' 제거! — iframe 내부에서 100vh는 부풀림 원인
  container: { backgroundColor: '#f5f5f5', fontFamily: '"Noto Sans JP", sans-serif', color: '#1a1a1a', lineHeight: 1.7 },

  header: { background: '#1a1a1a', color: 'white', padding: '28px 0' },
  headerInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '0.02em', margin: 0 },
  tagline: { fontSize: 13, fontWeight: 400, color: '#666', marginTop: 4 },

  nav: { background: 'white', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 100, overflowX: 'auto' },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 8 },
  navLink: { padding: '14px 16px', fontSize: 13, fontWeight: 500, color: '#666', border: 'none', borderBottom: '2px solid transparent', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  navLinkActive: { color: '#1a1a1a', borderBottomColor: '#e53935', fontWeight: 600 },

  main: { padding: '48px 0 80px' },
  mainInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },

  section: { marginBottom: 64 },
  sectionHeader: { marginBottom: 24 },
  sectionNumber: { fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.02em', marginBottom: 6 },
  sectionTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 6px 0', color: '#1a1a1a' },
  sectionDesc: { fontSize: 14, color: '#666', margin: 0 },

  hero: { paddingBottom: 40, borderBottom: '1px solid #e0e0e0', marginBottom: 40 },
  heroEyebrow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  heroDate: { fontSize: 15, fontWeight: 500, color: '#666' },
  heroBadge: { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 4, background: '#e53935', color: 'white' },
  heroNumber: { display: 'flex', alignItems: 'baseline', margin: '12px 0 20px' },
  heroDigits: { fontFamily: 'Inter, sans-serif', fontSize: 80, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color: '#1a1a1a' },
  heroUnit: { fontSize: 24, fontWeight: 500, color: '#666', marginLeft: 8 },
  heroCompare: { display: 'flex', gap: 40 },
  compareItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  compareLabel: { fontSize: 13, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' },
  compareValue: { display: 'flex', alignItems: 'center', gap: 4 },
  arrow: { fontSize: 12 },
  compareNum: { fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 700 },
  compareSub: { fontSize: 12, color: '#666' },
  insight: { marginTop: 24, padding: 20, background: '#f5f5f5', borderLeft: '3px solid #e53935', borderRadius: 0 },
  miniKpi: {
    padding: '16px 20px',
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  miniKpiLabel: { fontSize: 13, fontWeight: 600, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 },
  miniKpiVal: { fontSize: 32, fontWeight: 800, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', margin: '0 0 4px', color: '#1a1a1a' },
  miniKpiNote: { fontSize: 13, color: '#777', marginTop: 4 },
  insightText: { fontSize: 15, lineHeight: 1.8, color: '#333', margin: 0 },
  insightStrong: { fontWeight: 600, color: '#e53935' },
  insightMark: { background: 'linear-gradient(transparent 50%, #ffebee 50%)', padding: '0 2px' },

  chartWrap: { background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: 24 },
  chartTitleInline: { fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1a1a1a' },
  chartUnit: { fontSize: 13, fontWeight: 400, color: '#555' },
  chartSubtitle: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a1a1a' },
  chartSource: { marginTop: 16, paddingTop: 12, borderTop: '1px solid #e0e0e0', fontSize: 13, color: '#666' },

  countryTrendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  countryTrendCard: { background: '#f8f8f8', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' },
  countryTrendHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  countryTrendFlag: { fontSize: 20 },
  countryTrendName: { flex: 1, fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  countryTrendYoy: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700 },
  countryTrendBars: { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, height: 80, marginBottom: 12 },
  countryTrendBarCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  countryTrendBar: { width: 32, borderRadius: 4, transition: 'height 0.3s' },
  countryTrendBarLabel: { fontSize: 13, color: '#666' },
  countryTrendTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e0e0e0' },
  countryTrendTotalLabel: { fontSize: 12, color: '#666' },
  countryTrendTotalValue: { fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1a1a' },
  hbarList: { marginTop: 12 },
  hbarItem: { display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e0e0e0' },
  hbarRank: { width: 28, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700 },
  hbarFlag: { fontSize: 18, marginRight: 8 },
  hbarName: { width: 100, fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  hbarBarWrap: { flex: 1, margin: '0 12px' },
  hbarBar: { height: 24, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 40 },
  hbarPercent: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' },
  hbarValue: { width: 70, textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: '#1a1a1a' },
  hbarYoy: { width: 65, textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600 },

  expandBtn: { width: '100%', marginTop: 16, padding: '12px 0', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#666', cursor: 'pointer', transition: 'all 0.2s' },

  otherMarkets: { marginTop: 24, paddingTop: 20, borderTop: '1px solid #e0e0e0' },
  otherTitle: { fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 12 },
  otherGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 },
  otherItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f5f5f5', borderRadius: 4 },
  otherFlag: { fontSize: 16 },
  otherName: { flex: 1, fontSize: 13, fontWeight: 500, color: '#333' },
  otherValue: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
  otherYoy: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600 },

  trendLegend: { display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' },
  legendDot: { display: 'inline-block' },

  tooltip: { background: '#ffffff', padding: 14, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0' },
  tooltipTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 },

  phaseRow: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  phaseItem: { flex: 1, minWidth: 90, padding: '12px 0 12px 12px', borderLeft: '3px solid' },
  phaseLabel: { fontSize: 13, fontWeight: 600, color: '#666', margin: 0 },

  milestoneSection: { marginTop: 40 },
  milestoneTitle: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a1a1a' },
  milestoneGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  milestoneCard: { padding: 16, background: '#f5f5f5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  milestoneYear: { fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 800, color: '#1a1a1a' },
  milestoneEvent: { fontSize: 13, color: '#666' },
  milestoneValue: { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#1a1a1a' },

  yearSelector: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  yearBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 500, borderWidth: 1, borderStyle: 'solid', borderColor: '#e0e0e0', borderRadius: 4, background: 'white', cursor: 'pointer', transition: 'all 0.2s', color: '#666' },
  yearBtnActive: { background: '#1a1a1a', color: 'white', borderColor: '#1a1a1a' },

  annualHero: { textAlign: 'center', padding: 40, background: '#f5f5f5', borderRadius: 8, marginBottom: 32 },
  annualLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  annualNumber: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  annualDigits: { fontFamily: 'Inter, sans-serif', fontSize: 72, fontWeight: 800, lineHeight: 1, color: '#1a1a1a' },
  annualUnit: { fontSize: 28, fontWeight: 600, color: '#666' },
  annualGrowth: { fontSize: 16, color: '#666', marginTop: 12 },
  rankingSection: { marginTop: 24 },
  rankingTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1a1a1a' },
  rankCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#f5f5f5', borderRadius: 8, marginBottom: 6 },
  rankBadge: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 700 },
  rankFlag: { fontSize: 24 },
  rankName: { flex: 1, fontSize: 15, fontWeight: 500, color: '#1a1a1a' },
  rankValue: { fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: '#1a1a1a' },

  insightCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 },
  insightCard: { padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' },
  insightCardLabel: { fontSize: 12, color: '#666', marginBottom: 8 },
  insightCardValue: { fontSize: 18, fontWeight: 700, color: '#1a1a1a' },

  targetSection: { marginBottom: 32 },
  targetCard: { padding: 32, background: '#1a1a1a', borderRadius: 8, color: 'white' },
  targetLabel: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  targetRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginBottom: 24 },
  targetItem: { textAlign: 'center' },
  targetItemLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
  targetItemValue: { fontSize: 18, marginBottom: 12 },
  targetCurrent: { fontSize: 36, fontWeight: 800, color: '#ff9800' },
  targetArrow: { color: '#666', margin: '0 8px' },
  targetGoal: { fontSize: 36, fontWeight: 800, color: '#4caf50' },
  targetUnit: { fontSize: 16, color: '#666', marginLeft: 4 },
  progressBar: { height: 6, background: '#333', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #ff9800, #4caf50)', borderRadius: 3, transition: 'width 1s ease' },
  progressText: { fontSize: 13, color: '#666' },
  targetInsight: { textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid #333' },

  countryLegend: { display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
  countryLegendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  countryLegendDot: { width: 12, height: 12, borderRadius: '50%' },
  countryLegendFlag: { fontSize: 16 },
  countryLegendName: { fontSize: 13, fontWeight: 500, color: '#666' },

  growthList: { display: 'flex', flexDirection: 'column', gap: 8 },
  growthItem: { display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e0e0e0' },
  growthRank: { width: 24, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: '#666' },
  growthFlag: { fontSize: 18, marginRight: 8 },
  growthName: { width: 100, fontSize: 14, fontWeight: 500, color: '#1a1a1a' },
  growthBarWrap: { flex: 1, height: 20, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginRight: 12 },
  growthBar: { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },
  growthValue: { width: 60, textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700 },

  tableWrap: { marginTop: 24 },
  tableScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '12px 10px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap', background: '#f5f5f5' },
  thFirst: { textAlign: 'left', position: 'sticky', left: 0, background: '#f5f5f5', zIndex: 2 },
  thCovid: { color: '#e53935', opacity: 0.5 },
  thCurrent: { color: 'white', background: '#1a1a1a' },
  td: { padding: '12px 10px', textAlign: 'right', fontFamily: 'Inter, sans-serif', color: '#333', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap' },
  tdFirst: { textAlign: 'left', fontFamily: '"Noto Sans JP", sans-serif', fontWeight: 500, color: '#1a1a1a', position: 'sticky', left: 0, background: '#fff', zIndex: 1 },
  tdCovid: { color: '#e53935', opacity: 0.4 },
  tdCurrent: { color: '#e53935', fontWeight: 700, background: '#ffebee' },

  loadingBox: { display: 'flex', justifyContent: 'center', padding: 80 },
  spinner: { width: 40, height: 40, border: '3px solid #e0e0e0', borderTop: '3px solid #1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  errorBox: { padding: 16, background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 8, color: '#c62828', fontSize: 14 },

  footer: { maxWidth: 1100, margin: '0 auto', padding: 24, borderTop: '1px solid #e0e0e0', textAlign: 'center', fontSize: 13, color: '#666' }
};
