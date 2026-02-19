import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line, Cell, PieChart, Pie
} from 'recharts';

// ============================================================
// 설정
// ============================================================
const SHEET_ID = '1hF1Z-3LLgzzzFwc66xVqEXszNm3qSH8Xwl6DT01dQRs';
const API_KEY = 'AIzaSyAs_UERCv_a4ZCfrZI2XvThGMFPFRkStO0';

const COUNTRIES = ['韓国', '中国', '台湾', '香港', 'タイ', 'シンガポール', 'マレーシア', 'インドネシア', 'フィリピン', 'ベトナム', 'インド', '豪州', '米国', 'カナダ', 'メキシコ', '英国', 'フランス', 'ドイツ', 'イタリア', 'スペイン', 'ロシア', '北欧', '中東', 'その他'];

const COUNTRY_FLAGS = {
  '韓国': '🇰🇷', '中国': '🇨🇳', '台湾': '🇹🇼', '香港': '🇭🇰',
  'タイ': '🇹🇭', 'シンガポール': '🇸🇬', 'マレーシア': '🇲🇾', 'インドネシア': '🇮🇩',
  'フィリピン': '🇵🇭', 'ベトナム': '🇻🇳', 'インド': '🇮🇳', '豪州': '🇦🇺',
  '米国': '🇺🇸', 'カナダ': '🇨🇦', 'メキシコ': '🇲🇽', '英国': '🇬🇧',
  'フランス': '🇫🇷', 'ドイツ': '🇩🇪', 'イタリア': '🇮🇹', 'スペイン': '🇪🇸',
  'ロシア': '🇷🇺', '北欧': '🇸🇪', '中東': '🇦🇪', 'その他': '🌐'
};

const PIE_COLORS = [
  '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd',
  '#059669', '#10b981', '#34d399', '#6ee7b7',
  '#dc2626', '#f87171', '#fca5a5',
  '#d97706', '#fbbf24', '#fcd34d',
  '#7c3aed', '#a78bfa',
  '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'
];

const PHASE_COLORS = {
  '初期成長期': '#94a3b8',
  '本格成長期': '#64748b',
  'ピーク期': '#1e40af',
  'コロナ影響期': '#dc2626',
  '回復・成長期': '#1a1a1a'
};

// ============================================================
// 유틸리티
// ============================================================
const parseNumber = (str) => {
  if (!str) return 0;
  const cleaned = String(str).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return num.toLocaleString('ja-JP', { maximumFractionDigits: decimals });
};

const formatMan = (num) => {
  if (!num) return '—';
  return formatNumber(num / 10000, 1) + '万人';
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchSheetData = async (sheetName, retries = 2) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (response.status === 429 && retries > 0) {
      await delay(1000);
      return fetchSheetData(sheetName, retries - 1);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error(`Error fetching ${sheetName}:`, error);
    return [];
  }
};

// ============================================================
// 월간 하이라이트
// ============================================================
const MonthlyHighlight = ({ data, special }) => {
  if (!data || data.length === 0) return null;
  const latest = data[0];
  if (!latest) return null;

  const monthLabel = latest.month?.replace('2026-', '2026年').replace('2025-', '2025年').replace('-', '月') || '';
  const yoyChange = parseFloat(latest.yoy) || 0;
  const momChange = parseFloat(latest.mom) || 0;

  return (
    <div style={styles.highlightSection}>
      <div style={styles.highlightHeader}>
        <div>
          <p style={styles.highlightLabel}>{monthLabel} 訪日外客数</p>
          <div style={styles.highlightNumber}>
            <span style={styles.highlightDigits}>{formatNumber(latest.total / 10000, 1)}</span>
            <span style={styles.highlightUnit}>万人</span>
          </div>
        </div>
        <div style={styles.highlightMeta}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>前年同月比</span>
            <span style={{ ...styles.metaValue, color: yoyChange >= 0 ? '#059669' : '#dc2626' }}>
              {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}%
            </span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>前月比</span>
            <span style={{ ...styles.metaValue, color: momChange >= 0 ? '#059669' : '#dc2626' }}>
              {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      {special && special.length > 0 && (
        <div style={styles.specialNote}>
          {special.map((s, i) => (
            <p key={i} style={styles.specialText}>
              <strong>{s.country}</strong>が{formatMan(s.value)}を記録。{s.note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 국별 구성비 파이 차트
// ============================================================
const CountryPieChart = ({ data, month }) => {
  if (!data || Object.keys(data).length === 0) return null;

  const total = Object.entries(data)
    .filter(([k]) => COUNTRIES.includes(k))
    .reduce((sum, [, v]) => sum + (v || 0), 0);

  const pieData = Object.entries(data)
    .filter(([k]) => COUNTRIES.includes(k) && data[k] > 0)
    .map(([country, value]) => ({
      name: country,
      value: value,
      percent: ((value / total) * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div style={styles.chartSection}>
      <h3 style={styles.chartTitle}>国別構成比</h3>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={150}
            paddingAngle={1}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${percent}%`}
            labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
          >
            {pieData.map((entry, index) => (
              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMan(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================
// 월별 추이 차트
// ============================================================
const MonthlyTrendChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 13).reverse().map(d => ({
    ...d,
    totalMan: d.total / 10000,
    prevYearMan: d.prevYear / 10000,
    label: d.month?.split('-')[1] || ''
  }));

  return (
    <div style={styles.chartSection}>
      <h3 style={styles.chartTitle}>月別訪日外客数の推移</h3>
      <p style={styles.chartSubtitle}>実線: 当年 / 点線: 前年同月</p>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `${v.toFixed(0)}`} label={{ value: '万人', position: 'top', offset: 10 }} />
          <Tooltip formatter={(value) => [`${value.toFixed(1)}万人`]} />
          <Bar dataKey="totalMan" fill="#1a1a1a" radius={[4, 4, 0, 0]} name="当年" />
          <Line type="monotone" dataKey="prevYearMan" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="前年同月" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================
// 국가별 카드
// ============================================================
const CountryCards = ({ countryData, month }) => {
  if (!countryData || Object.keys(countryData).length === 0) return null;

  const topCountries = Object.entries(countryData)
    .filter(([k]) => COUNTRIES.includes(k) && k !== 'その他')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div style={styles.cardsSection}>
      <h3 style={styles.chartTitle}>{month} 主要国・地域別</h3>
      <div style={styles.cardsGrid}>
        {topCountries.map(([country, value], i) => (
          <div key={country} style={styles.countryCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardFlag}>{COUNTRY_FLAGS[country] || '🌐'}</span>
              <span style={styles.cardCountry}>{country}</span>
            </div>
            <div style={styles.cardValue}>{formatMan(value)}</div>
            <div style={styles.cardBar}>
              <div style={{ ...styles.cardBarFill, width: `${(value / topCountries[0][1]) * 100}%`, backgroundColor: PIE_COLORS[i] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// 국가별 순위
// ============================================================
const CountryRanking = ({ data, month }) => {
  if (!data || Object.keys(data).length === 0) return null;

  const sortedCountries = Object.entries(data)
    .filter(([k]) => COUNTRIES.includes(k) && data[k] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const maxValue = sortedCountries[0]?.[1] || 1;

  return (
    <div style={styles.rankingSection}>
      <h3 style={styles.chartTitle}>{month} 国・地域別 訪日客数ランキング</h3>
      <div style={styles.countryList}>
        {sortedCountries.map(([country, value], i) => (
          <div key={country} style={styles.countryRow}>
            <div style={styles.countryLeft}>
              <span style={{ ...styles.countryRank, backgroundColor: i < 3 ? '#1a1a1a' : '#f3f4f6', color: i < 3 ? '#fff' : '#6b7280' }}>{i + 1}</span>
              <span style={styles.countryFlag}>{COUNTRY_FLAGS[country] || '🌐'}</span>
              <span style={styles.countryName}>{country}</span>
            </div>
            <div style={styles.countryRight}>
              <div style={styles.countryBar}>
                <div style={{ ...styles.countryBarFill, width: `${(value / maxValue) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              </div>
              <span style={styles.countryValue}>{formatMan(value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// 연간 총괄
// ============================================================
const AnnualSummary = ({ data, year }) => {
  if (!data || data.length === 0) return null;
  const yearData = data.find(d => String(d.year) === String(year));
  if (!yearData) return null;

  return (
    <div style={styles.annualSection}>
      <div style={styles.annualHero}>
        <p style={styles.annualLabel}>{year}年 訪日外国人旅行者数</p>
        <div style={styles.annualNumber}>
          <span style={styles.annualDigits}>{formatNumber(yearData.total / 10000, 0)}</span>
          <span style={styles.annualUnit}>万人</span>
        </div>
        <div style={styles.annualGrowth}>
          前年比 <span style={{ color: parseFloat(yearData.yoy) >= 0 ? '#059669' : '#dc2626', fontWeight: 700, marginLeft: 8 }}>
            {parseFloat(yearData.yoy) >= 0 ? '+' : ''}{yearData.yoy}%
          </span>
        </div>
      </div>
      <div style={styles.annualRanking}>
        <h4 style={styles.subTitle}>国・地域別 年間ランキング TOP5</h4>
        <div style={styles.rankingGrid}>
          {[1, 2, 3, 4, 5].map(rank => {
            const country = yearData[`rank${rank}`];
            const value = yearData[`rank${rank}Value`];
            if (!country) return null;
            return (
              <div key={rank} style={styles.rankCard}>
                <span style={styles.rankBadge}>{rank}</span>
                <span style={styles.rankFlag}>{COUNTRY_FLAGS[country] || '🌐'}</span>
                <span style={styles.rankName}>{country}</span>
                <span style={styles.rankValue}>{formatMan(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 장기 추이
// ============================================================
const LongTermChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div style={styles.chartSection}>
      <h3 style={styles.chartTitle}>訪日外国人数の長期推移</h3>
      <p style={styles.chartSubtitle}>2003年〜2025年 ビジット・ジャパン事業の軌跡</p>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-45} textAnchor="end" height={80} tickFormatter={v => `${v}年`} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: '万人', position: 'top', offset: 10 }} />
          <Tooltip formatter={(value) => [`${formatNumber(value, 0)}万人`, '訪日客数']} labelFormatter={v => `${v}年`} />
          <Bar dataKey="total" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={PHASE_COLORS[entry.phase] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={styles.legendRow}>
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <div key={phase} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: color }} />
            <span style={styles.legendText}>{phase}</span>
          </div>
        ))}
      </div>
    </div>
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
  const [countryData, setCountryData] = useState({});
  const [annualData, setAnnualData] = useState([]);
  const [longTermData, setLongTermData] = useState([]);
  const [specialData, setSpecialData] = useState([]);

  useEffect(() => {
    const sendHeight = () => {
      requestAnimationFrame(() => {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ type: 'setHeight', height }, '*');
      });
    };
    const timer = setTimeout(sendHeight, 500);
    window.addEventListener('resize', sendHeight);
    const observer = new MutationObserver(() => setTimeout(sendHeight, 300));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { clearTimeout(timer); window.removeEventListener('resize', sendHeight); observer.disconnect(); };
  }, [activeTab, loading]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const monthly = await fetchSheetData('訪日_月間');
        if (monthly?.length > 1) {
          setMonthlyData(monthly.slice(1).map(row => ({
            month: row[0], total: parseNumber(row[1]), prevYear: parseNumber(row[2]),
            yoy: parseNumber(row[3]), prevMonth: parseNumber(row[4]), mom: parseNumber(row[5])
          })));
        }
        await delay(150);
        
        const country = await fetchSheetData('訪日_国別');
        if (country?.length > 1) {
          const headers = country[0];
          const latestRow = country[1];
          const parsed = { month: latestRow[0] };
          headers.forEach((h, i) => { if (i > 0 && h) parsed[h] = parseNumber(latestRow[i]); });
          setCountryData(parsed);
        }
        await delay(150);
        
        const annual = await fetchSheetData('訪日_年間');
        if (annual?.length > 1) {
          setAnnualData(annual.slice(1).map(row => ({
            year: String(row[0]), total: parseNumber(row[1]), yoy: row[2],
            rank1: row[3], rank1Value: parseNumber(row[4]),
            rank2: row[5], rank2Value: parseNumber(row[6]),
            rank3: row[7], rank3Value: parseNumber(row[8]),
            rank4: row[9], rank4Value: parseNumber(row[10]),
            rank5: row[11], rank5Value: parseNumber(row[12])
          })));
        }
        await delay(150);
        
        const longTerm = await fetchSheetData('訪日_長期推移');
        if (longTerm?.length > 1) {
          setLongTermData(longTerm.slice(1).map(row => ({
            year: String(row[0]), total: parseNumber(row[1]), phase: row[2]
          })));
        }
        await delay(150);
        
        const special = await fetchSheetData('訪日_特記');
        if (special?.length > 1) {
          setSpecialData(special.slice(1).map(row => ({
            month: row[0], content: row[1], country: row[2], value: parseNumber(row[3]), note: row[4]
          })).filter(s => s.month === '2026-01'));
        }
      } catch (err) {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const latestMonth = monthlyData[0]?.month?.replace('-', '年') + '月' || '';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.title}>訪日外客統計</h1>
          <p style={styles.subtitle}>JNTO公式データに基づく訪日外国人旅行者統計</p>
        </div>
      </header>

      <nav style={styles.tabNav}>
        {[
          { id: 'monthly', label: '最新月間' },
          { id: 'annual', label: '年間総括' },
          { id: 'trend', label: '長期推移' },
          { id: 'country', label: '国・地域別' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {}) }}>
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {loading ? (
          <div style={styles.loadingBox}><div style={styles.spinner} /></div>
        ) : (
          <>
            {activeTab === 'monthly' && (
              <>
                <MonthlyHighlight data={monthlyData} special={specialData} />
                <MonthlyTrendChart data={monthlyData} />
                <CountryPieChart data={countryData} month={latestMonth} />
                <CountryCards countryData={countryData} month={latestMonth} />
              </>
            )}
            {activeTab === 'annual' && <AnnualSummary data={annualData} year="2025" />}
            {activeTab === 'trend' && <LongTermChart data={longTermData} />}
            {activeTab === 'country' && (
              <>
                <CountryPieChart data={countryData} month={latestMonth} />
                <CountryRanking data={countryData} month={latestMonth} />
              </>
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>出典：JNTO（日本政府観光局）</footer>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '"Noto Sans JP", sans-serif', color: '#1a1a1a', lineHeight: 1.6 },
  header: { backgroundColor: '#1a1a1a', color: '#fff' },
  headerInner: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px' },
  title: { margin: 0, fontSize: 28, fontWeight: 800 },
  subtitle: { margin: '8px 0 0', fontSize: 14, opacity: 0.7 },
  tabNav: { maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4, backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' },
  tabBtn: { padding: '16px 24px', fontSize: 14, fontWeight: 500, border: 'none', borderBottom: '3px solid transparent', backgroundColor: 'transparent', color: '#6b7280', cursor: 'pointer' },
  tabBtnActive: { color: '#1a1a1a', fontWeight: 700, borderBottomColor: '#1a1a1a' },
  main: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px' },
  highlightSection: { backgroundColor: '#fff', borderRadius: 12, padding: 32, marginBottom: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  highlightHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 },
  highlightLabel: { fontSize: 14, color: '#6b7280', margin: '0 0 8px' },
  highlightNumber: { display: 'flex', alignItems: 'baseline', gap: 8 },
  highlightDigits: { fontSize: 64, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 },
  highlightUnit: { fontSize: 24, fontWeight: 600, color: '#6b7280' },
  highlightMeta: { display: 'flex', gap: 32 },
  metaItem: { textAlign: 'right' },
  metaLabel: { display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  metaValue: { fontSize: 28, fontWeight: 700 },
  specialNote: { marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' },
  specialText: { fontSize: 15, color: '#374151', margin: '0 0 8px', lineHeight: 1.7 },
  chartSection: { backgroundColor: '#fff', borderRadius: 12, padding: 32, marginBottom: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  chartTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' },
  chartSubtitle: { fontSize: 13, color: '#6b7280', margin: '0 0 24px' },
  cardsSection: { backgroundColor: '#fff', borderRadius: 12, padding: 32, marginBottom: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 },
  countryCard: { padding: 20, backgroundColor: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardFlag: { fontSize: 28 },
  cardCountry: { fontSize: 16, fontWeight: 600 },
  cardValue: { fontSize: 24, fontWeight: 700, marginBottom: 12 },
  cardBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  cardBarFill: { height: '100%', borderRadius: 4 },
  rankingSection: { backgroundColor: '#fff', borderRadius: 12, padding: 32, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  countryList: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 },
  countryRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 0' },
  countryLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 },
  countryRank: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontSize: 13, fontWeight: 700 },
  countryFlag: { fontSize: 22 },
  countryName: { fontSize: 14, fontWeight: 500 },
  countryRight: { flex: 1, display: 'flex', alignItems: 'center', gap: 16 },
  countryBar: { flex: 1, height: 28, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden' },
  countryBarFill: { height: '100%', borderRadius: 6 },
  countryValue: { fontSize: 14, fontWeight: 600, minWidth: 90, textAlign: 'right' },
  annualSection: { backgroundColor: '#fff', borderRadius: 12, padding: 32, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  annualHero: { textAlign: 'center', paddingBottom: 32, borderBottom: '1px solid #e5e7eb', marginBottom: 32 },
  annualLabel: { fontSize: 14, color: '#6b7280', margin: '0 0 12px' },
  annualNumber: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  annualDigits: { fontSize: 80, fontWeight: 800, lineHeight: 1 },
  annualUnit: { fontSize: 28, fontWeight: 600, color: '#6b7280' },
  annualGrowth: { fontSize: 18, color: '#6b7280', marginTop: 16 },
  annualRanking: {},
  subTitle: { fontSize: 16, fontWeight: 600, marginBottom: 20 },
  rankingGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  rankCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', backgroundColor: '#f9fafb', borderRadius: 8 },
  rankBadge: { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700 },
  rankFlag: { fontSize: 28 },
  rankName: { flex: 1, fontSize: 16, fontWeight: 500 },
  rankValue: { fontSize: 16, fontWeight: 700 },
  legendRow: { display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 3 },
  legendText: { fontSize: 12, color: '#6b7280' },
  loadingBox: { display: 'flex', justifyContent: 'center', padding: 80 },
  spinner: { width: 40, height: 40, border: '3px solid #e5e7eb', borderTop: '3px solid #1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  errorBox: { padding: 16, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 14 },
  footer: { maxWidth: 1000, margin: '0 auto', padding: '24px', fontSize: 12, color: '#9ca3af', borderTop: '1px solid #e5e7eb', textAlign: 'center' }
};
