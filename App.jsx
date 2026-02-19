import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line, Cell, Area, AreaChart
} from 'recharts';

// ============================================================
// 설정
// ============================================================
const SHEET_ID = '1hF1Z-3LLgzzzFwc66xVqEXszNm3qSH8Xwl6DT01dQRs';
const API_KEY = 'AIzaSyAs_UERCv_a4ZCfrZI2XvThGMFPFRkStO0';

const COUNTRIES = ['韓国', '中国', '台湾', '香港', 'タイ', 'シンガポール', 'マレーシア', 'インドネシア', 'フィリピン', 'ベトナム', 'インド', '豪州', '米国', 'カナダ', 'メキシコ', '英国', 'フランス', 'ドイツ', 'イタリア', 'スペイン', 'ロシア', '北欧', '中東', 'その他'];

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
// 월간 하이라이트 컴포넌트
// ============================================================
const MonthlyHighlight = ({ data, special }) => {
  if (!data) return null;
  
  const latest = data[0];
  if (!latest) return null;

  const yoyChange = parseFloat(latest.yoy);
  const momChange = parseFloat(latest.mom);

  return (
    <div style={styles.highlightSection}>
      <div style={styles.highlightHeader}>
        <div>
          <p style={styles.highlightLabel}>{latest.month} 訪日外客数</p>
          <div style={styles.highlightNumber}>
            <span style={styles.highlightDigits}>{formatNumber(latest.total / 10000, 1)}</span>
            <span style={styles.highlightUnit}>万人</span>
          </div>
        </div>
        <div style={styles.highlightMeta}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>前年同月比</span>
            <span style={{
              ...styles.metaValue,
              color: yoyChange >= 0 ? '#059669' : '#dc2626'
            }}>
              {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}%
            </span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>前月比</span>
            <span style={{
              ...styles.metaValue,
              color: momChange >= 0 ? '#059669' : '#dc2626'
            }}>
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
// 연간 총괄 컴포넌트
// ============================================================
const AnnualSummary = ({ data, year }) => {
  if (!data) return null;

  const yearData = data.find(d => d.year === year);
  if (!yearData) return null;

  const prevYearData = data.find(d => d.year === String(parseInt(year) - 1));
  
  return (
    <div style={styles.annualSection}>
      <div style={styles.annualHeader}>
        <h3 style={styles.annualTitle}>{year}年 年間総括</h3>
      </div>
      
      <div style={styles.annualHero}>
        <span style={styles.annualDigits}>{formatNumber(yearData.total / 10000, 0)}</span>
        <span style={styles.annualUnit}>万人</span>
      </div>
      
      <div style={styles.annualGrowth}>
        前年比 
        <span style={{ color: parseFloat(yearData.yoy) >= 0 ? '#059669' : '#dc2626', fontWeight: 700, marginLeft: 8 }}>
          {parseFloat(yearData.yoy) >= 0 ? '+' : ''}{yearData.yoy}%
        </span>
      </div>

      <div style={styles.annualRanking}>
        <div style={styles.rankingTitle}>国・地域別 TOP5</div>
        <div style={styles.rankingList}>
          {[1, 2, 3, 4, 5].map(rank => (
            <div key={rank} style={styles.rankingItem}>
              <span style={styles.rankNum}>{rank}</span>
              <span style={styles.rankCountry}>{yearData[`rank${rank}`]}</span>
              <span style={styles.rankValue}>{formatMan(yearData[`rank${rank}Value`])}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 장기 추이 차트
// ============================================================
const LongTermChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div style={styles.chartSection}>
      <h3 style={styles.chartTitle}>訪日外国人数の長期推移（2003-2025年）</h3>
      <p style={styles.chartSubtitle}>ビジット・ジャパン事業22年間の軌跡</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
            tickFormatter={v => `${v}年`}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={v => `${v}`}
            label={{ value: '（万人）', position: 'top', offset: 10, fontSize: 11, fill: '#6b7280' }}
          />
          <Tooltip 
            formatter={(value, name, props) => [`${formatNumber(value, 0)}万人`, '訪日客数']}
            labelFormatter={v => `${v}年`}
            contentStyle={{ fontSize: 13 }}
          />
          <Bar dataKey="total" radius={[2, 2, 0, 0]}>
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
// 월별 추이 차트
// ============================================================
const MonthlyTrendChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  // 최근 13개월
  const chartData = data.slice(0, 13).reverse();

  return (
    <div style={styles.chartSection}>
      <h3 style={styles.chartTitle}>月別訪日外客数の推移</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={v => v.replace('2025-', '').replace('2026-', '')}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={v => `${(v / 10000).toFixed(0)}`}
            label={{ value: '（万人）', position: 'top', offset: 10, fontSize: 11, fill: '#6b7280' }}
          />
          <Tooltip 
            formatter={(value) => [`${formatNumber(value / 10000, 1)}万人`, '訪日客数']}
            contentStyle={{ fontSize: 13 }}
          />
          <Bar dataKey="total" fill="#1a1a1a" radius={[2, 2, 0, 0]} />
          <Line 
            type="monotone" 
            dataKey="prevYear" 
            stroke="#9ca3af" 
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            name="前年同月"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================
// 국가별 순위
// ============================================================
const CountryRanking = ({ data, month }) => {
  if (!data) return null;

  // 데이터를 순위별로 정렬
  const sortedCountries = COUNTRIES
    .map(country => ({ country, value: data[country] || 0 }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const maxValue = sortedCountries[0]?.value || 1;

  return (
    <div style={styles.rankingSection}>
      <h3 style={styles.chartTitle}>{month} 国・地域別 訪日客数</h3>
      
      <div style={styles.countryList}>
        {sortedCountries.map((c, i) => (
          <div key={c.country} style={styles.countryRow}>
            <div style={styles.countryLeft}>
              <span style={{
                ...styles.countryRank,
                backgroundColor: i < 3 ? '#1a1a1a' : '#e5e7eb',
                color: i < 3 ? '#fff' : '#6b7280'
              }}>{i + 1}</span>
              <span style={styles.countryName}>{c.country}</span>
            </div>
            <div style={styles.countryRight}>
              <div style={styles.countryBar}>
                <div style={{
                  ...styles.countryBarFill,
                  width: `${(c.value / maxValue) * 100}%`
                }} />
              </div>
              <span style={styles.countryValue}>{formatMan(c.value)}</span>
            </div>
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

  // iframe 높이 전달
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
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', sendHeight);
      observer.disconnect();
    };
  }, [activeTab, loading]);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 월간 데이터
        await delay(100);
        const monthly = await fetchSheetData('訪日_月間');
        if (monthly && monthly.length > 1) {
          const parsed = monthly.slice(1).map(row => ({
            month: row[0],
            total: parseNumber(row[1]),
            prevYear: parseNumber(row[2]),
            yoy: parseNumber(row[3]),
            prevMonth: parseNumber(row[4]),
            mom: parseNumber(row[5])
          }));
          setMonthlyData(parsed);
        }

        // 국가별 데이터 (최신 월)
        await delay(200);
        const country = await fetchSheetData('訪日_国別');
        if (country && country.length > 1) {
          const headers = country[0];
          const latestRow = country[1];
          const parsed = {};
          headers.forEach((h, i) => {
            if (i > 0) parsed[h] = parseNumber(latestRow[i]);
          });
          parsed.month = latestRow[0];
          setCountryData(parsed);
        }

        // 연간 데이터
        await delay(200);
        const annual = await fetchSheetData('訪日_年間');
        if (annual && annual.length > 1) {
          const parsed = annual.slice(1).map(row => ({
            year: String(row[0]),
            total: parseNumber(row[1]),
            yoy: row[2],
            rank1: row[3], rank1Value: parseNumber(row[4]),
            rank2: row[5], rank2Value: parseNumber(row[6]),
            rank3: row[7], rank3Value: parseNumber(row[8]),
            rank4: row[9], rank4Value: parseNumber(row[10]),
            rank5: row[11], rank5Value: parseNumber(row[12])
          }));
          setAnnualData(parsed);
        }

        // 장기 추이
        await delay(200);
        const longTerm = await fetchSheetData('訪日_長期推移');
        if (longTerm && longTerm.length > 1) {
          const parsed = longTerm.slice(1).map(row => ({
            year: String(row[0]),
            total: parseNumber(row[1]),
            phase: row[2]
          }));
          setLongTermData(parsed);
        }

        // 특기사항
        await delay(200);
        const special = await fetchSheetData('訪日_特記');
        if (special && special.length > 1) {
          const parsed = special.slice(1).map(row => ({
            month: row[0],
            content: row[1],
            country: row[2],
            value: parseNumber(row[3]),
            note: row[4]
          })).filter(s => s.month === monthlyData[0]?.month || s.month === '2026-01');
          setSpecialData(parsed);
        }

      } catch (err) {
        console.error(err);
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
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.id ? styles.tabBtnActive : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.errorBox}>{error}</div>}
        
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
          </div>
        ) : (
          <>
            {activeTab === 'monthly' && (
              <>
                <MonthlyHighlight data={monthlyData} special={specialData} />
                <MonthlyTrendChart data={monthlyData} />
                <CountryRanking data={countryData} month={latestMonth} />
              </>
            )}
            
            {activeTab === 'annual' && (
              <AnnualSummary data={annualData} year="2025" />
            )}
            
            {activeTab === 'trend' && (
              <LongTermChart data={longTermData} />
            )}
            
            {activeTab === 'country' && (
              <CountryRanking data={countryData} month={latestMonth} />
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>
        <span>出典：JNTO（日本政府観光局）</span>
      </footer>
    </div>
  );
}

// ============================================================
// 스타일
// ============================================================
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '"Noto Sans JP", sans-serif',
    color: '#1a1a1a',
    lineHeight: 1.6
  },
  header: {
    backgroundColor: '#1a1a1a',
    color: '#fff'
  },
  headerInner: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '32px 24px'
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: '-0.01em'
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 14,
    opacity: 0.7
  },
  tabNav: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    gap: 4,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb'
  },
  tabBtn: {
    padding: '16px 24px',
    fontSize: 14,
    fontWeight: 500,
    border: 'none',
    borderBottom: '3px solid transparent',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer'
  },
  tabBtnActive: {
    color: '#1a1a1a',
    fontWeight: 700,
    borderBottomColor: '#1a1a1a'
  },
  main: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '32px 24px'
  },
  // Highlight
  highlightSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    marginBottom: 24,
    border: '1px solid #e5e7eb'
  },
  highlightHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 24
  },
  highlightLabel: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 8px'
  },
  highlightNumber: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8
  },
  highlightDigits: {
    fontSize: 56,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1
  },
  highlightUnit: {
    fontSize: 20,
    fontWeight: 600,
    color: '#6b7280'
  },
  highlightMeta: {
    display: 'flex',
    gap: 24
  },
  metaItem: {
    textAlign: 'right'
  },
  metaLabel: {
    display: 'block',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4
  },
  metaValue: {
    fontSize: 24,
    fontWeight: 700
  },
  specialNote: {
    marginTop: 24,
    paddingTop: 24,
    borderTop: '1px solid #e5e7eb'
  },
  specialText: {
    fontSize: 15,
    color: '#374151',
    margin: '0 0 8px',
    lineHeight: 1.7
  },
  // Annual
  annualSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    border: '1px solid #e5e7eb'
  },
  annualHeader: {
    marginBottom: 24
  },
  annualTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0
  },
  annualHero: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8
  },
  annualDigits: {
    fontSize: 72,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1
  },
  annualUnit: {
    fontSize: 24,
    fontWeight: 600,
    color: '#6b7280'
  },
  annualGrowth: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32
  },
  annualRanking: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: 24
  },
  rankingTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 16
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  rankNum: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280'
  },
  rankCountry: {
    fontSize: 15,
    fontWeight: 500,
    flex: 1
  },
  rankValue: {
    fontSize: 15,
    fontWeight: 600,
    color: '#374151'
  },
  // Chart
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    marginBottom: 24,
    border: '1px solid #e5e7eb'
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 8px'
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 24px'
  },
  legendRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    marginTop: 24,
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280'
  },
  // Country Ranking
  rankingSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    border: '1px solid #e5e7eb'
  },
  countryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 24
  },
  countryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  countryLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 120
  },
  countryRank: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700
  },
  countryName: {
    fontSize: 14,
    fontWeight: 500
  },
  countryRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  countryBar: {
    flex: 1,
    height: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden'
  },
  countryBarFill: {
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    transition: 'width 0.3s'
  },
  countryValue: {
    fontSize: 14,
    fontWeight: 600,
    minWidth: 80,
    textAlign: 'right'
  },
  // Utility
  loadingBox: {
    display: 'flex',
    justifyContent: 'center',
    padding: 60
  },
  spinner: {
    width: 32,
    height: 32,
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #1a1a1a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  errorBox: {
    padding: 16,
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 4,
    color: '#dc2626',
    fontSize: 13
  },
  footer: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '24px',
    fontSize: 12,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center'
  }
};
