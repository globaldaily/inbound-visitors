import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts';

// ============================================================
// 설정
// ============================================================
const SHEET_ID = '1hF1Z-3LLgzzzFwc66xVqEXszNm3qSH8Xwl6DT01dQRs';
const API_KEY = 'AIzaSyAs_UERCv_a4ZCfrZI2XvThGMFPFRkStO0';

const COUNTRIES = ['韓国', '中国', '台湾', '香港', 'タイ', 'シンガポール', 'マレーシア', 'インドネシア', 'フィリピン', 'ベトナム', 'インド', '豪州', '米国', 'カナダ', 'メキシコ', '英国', 'フランス', 'ドイツ', 'イタリア', 'スペイン', 'ロシア', '北欧地域', '中東地域', 'その他'];

const COUNTRY_FLAGS = {
  '韓国': '🇰🇷', '中国': '🇨🇳', '台湾': '🇹🇼', '香港': '🇭🇰',
  'タイ': '🇹🇭', 'シンガポール': '🇸🇬', 'マレーシア': '🇲🇾', 'インドネシア': '🇮🇩',
  'フィリピン': '🇵🇭', 'ベトナム': '🇻🇳', 'インド': '🇮🇳', '豪州': '🇦🇺',
  '米国': '🇺🇸', 'カナダ': '🇨🇦', 'メキシコ': '🇲🇽', '英国': '🇬🇧',
  'フランス': '🇫🇷', 'ドイツ': '🇩🇪', 'イタリア': '🇮🇹', 'スペイン': '🇪🇸',
  'ロシア': '🇷🇺', '北欧地域': '🇸🇪', '中東地域': '🇦🇪', 'その他': '🌐'
};

const COUNTRY_COLORS = [
  'linear-gradient(90deg, #0369a1, #0ea5e9)',
  'linear-gradient(90deg, #0ea5e9, #38bdf8)',
  'linear-gradient(90deg, #6366f1, #818cf8)',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16'
];

const YEAR_COLORS = {
  '2026': '#dc2626',
  '2025': '#1e40af',
  '2024': '#f97316',
  '2023': '#eab308',
  '2019': '#9ca3af',
  '2018': '#22c55e',
  '2017': '#3b82f6'
};

const PHASE_COLORS = {
  '初期成長期': '#93c5fd',
  '本格成長期': '#86efac',
  'ピーク期': '#fcd34d',
  'コロナ影響期': '#fca5a5',
  '回復・成長期': '#c4b5fd'
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
  return formatNumber(num / 10000, 1) + '万';
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
// Hero KPI
// ============================================================
const HeroSection = ({ data, special }) => {
  if (!data || data.length === 0) return null;
  const latest = data[0];
  if (!latest) return null;

  const monthLabel = latest.month?.replace('2026-', '2026年').replace('2025-', '2025年').replace('-', '月') || '';
  const yoyChange = parseFloat(latest.yoy) || 0;
  const momChange = parseFloat(latest.mom) || 0;

  return (
    <section style={styles.hero}>
      <div style={styles.heroEyebrow}>
        <span style={styles.heroDate}>{monthLabel} 訪日外客数</span>
        <span style={styles.heroBadge}>速報</span>
      </div>
      <div style={styles.heroNumber}>
        <span style={styles.heroDigits}>{formatNumber(latest.total / 10000, 1)}</span>
        <span style={styles.heroUnit}>万人</span>
      </div>
      <div style={styles.heroCompare}>
        <div style={styles.compareItem}>
          <span style={styles.compareLabel}>前年同月比</span>
          <div style={styles.compareValue}>
            <span style={{...styles.arrow, color: yoyChange >= 0 ? '#059669' : '#dc2626'}}>
              {yoyChange >= 0 ? '▲' : '▼'}
            </span>
            <span style={{...styles.compareNum, color: yoyChange >= 0 ? '#059669' : '#dc2626'}}>
              {Math.abs(yoyChange).toFixed(1)}%
            </span>
          </div>
          <span style={styles.compareSub}>2025年1月: {formatMan(latest.prevYear)}</span>
        </div>
        <div style={styles.compareItem}>
          <span style={styles.compareLabel}>前月比</span>
          <div style={styles.compareValue}>
            <span style={{...styles.arrow, color: momChange >= 0 ? '#059669' : '#dc2626'}}>
              {momChange >= 0 ? '▲' : '▼'}
            </span>
            <span style={{...styles.compareNum, color: momChange >= 0 ? '#059669' : '#dc2626'}}>
              {Math.abs(momChange).toFixed(1)}%
            </span>
          </div>
          <span style={styles.compareSub}>2025年12月: {formatMan(latest.prevMonth)}</span>
        </div>
      </div>
      {special && special.length > 0 && (
        <div style={styles.insight}>
          <p style={styles.insightText}>
            <strong style={styles.insightStrong}>{special[0]?.country}</strong>が
            <mark style={styles.insightMark}>{formatMan(special[0]?.value)}</mark>を記録。
            {special[0]?.note}
          </p>
        </div>
      )}
    </section>
  );
};

// ============================================================
// 국가별 수평 바 차트 (訪日_国別_202601 시트 사용)
// ============================================================
const CountryHorizontalBars = ({ data, total }) => {
  if (!data || data.length === 0) return null;

  const topCountries = data.slice(0, 10);
  const otherCountries = data.slice(10);
  const maxValue = topCountries[0]?.value || 1;

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.sectionNumber}>01</p>
        <h2 style={styles.sectionTitle}>国・地域別シェア</h2>
        <p style={styles.sectionDesc}>2026年1月の市場別構成比。バーの長さ＝シェア。</p>
      </div>

      <div style={styles.chartWrap}>
        <div style={styles.chartTitleInline}>
          <span>上位10市場</span>
          <span style={styles.chartUnit}>総数: {formatMan(total)}</span>
        </div>

        <div style={styles.hbarList}>
          {topCountries.map((country, i) => {
            const percent = total > 0 ? ((country.value / total) * 100).toFixed(1) : 0;
            const width = (country.value / maxValue) * 100;
            const yoy = country.yoy || 0;

            return (
              <div key={country.name} style={styles.hbarItem}>
                <span style={{...styles.hbarRank, color: i < 3 ? '#0369a1' : '#94a3b8'}}>{i + 1}</span>
                <span style={styles.hbarFlag}>{COUNTRY_FLAGS[country.name] || '🌐'}</span>
                <span style={styles.hbarName}>{country.name}</span>
                <div style={styles.hbarBarWrap}>
                  <div style={styles.hbarBar}>
                    <div style={{
                      ...styles.hbarFill,
                      width: `${Math.max(width, 15)}%`,
                      background: COUNTRY_COLORS[i] || '#94a3b8'
                    }}>
                      <span style={styles.hbarPercent}>{percent}%</span>
                    </div>
                  </div>
                </div>
                <span style={styles.hbarValue}>{formatMan(country.value)}</span>
                <span style={{
                  ...styles.hbarYoy,
                  color: yoy >= 0 ? '#059669' : '#dc2626'
                }}>
                  {yoy >= 0 ? '▲' : '▼'}{Math.abs(yoy).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>

        {otherCountries.length > 0 && (
          <div style={styles.otherMarkets}>
            <p style={styles.otherTitle}>その他の市場（11位以下）</p>
            <div style={styles.otherGrid}>
              {otherCountries.slice(0, 8).map(country => {
                const yoy = country.yoy || 0;
                return (
                  <div key={country.name} style={styles.otherItem}>
                    <span style={styles.otherFlag}>{COUNTRY_FLAGS[country.name] || '🌐'}</span>
                    <span style={styles.otherName}>{country.name}</span>
                    <div style={styles.otherBar}>
                      <div style={{
                        ...styles.otherFill,
                        width: `${Math.min((country.value / (topCountries[topCountries.length - 1]?.value || 1)) * 100, 100)}%`
                      }} />
                    </div>
                    <span style={styles.otherValue}>{formatMan(country.value)}</span>
                    <span style={{
                      ...styles.otherYoy,
                      color: yoy >= 0 ? '#059669' : '#dc2626'
                    }}>
                      {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p style={styles.chartSource}>出典：JNTO訪日外客統計（2026年1月推計値）</p>
      </div>
    </section>
  );
};

// ============================================================
// 월별 추이 차트 (다년도)
// ============================================================
const MonthlyTrendChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const years = ['2026', '2025', '2024', '2023', '2019', '2018', '2017'];
  
  const chartData = [];
  for (let m = 1; m <= 12; m++) {
    const row = { month: `${m}月` };
    years.forEach(year => {
      const found = data.find(d => d.month === m && d.year === year + '年');
      if (found && found.value > 0) {
        row[year] = found.value / 10000;
      }
    });
    chartData.push(row);
  }

  // 커스텀 툴팁 - 흰색 텍스트
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div style={styles.tooltip}>
        <p style={styles.tooltipTitle}>{label}</p>
        {payload.filter(p => p.value).map((p, i) => (
          <p key={i} style={{...styles.tooltipItem, color: p.color}}>
            {p.dataKey}年: {p.value.toFixed(1)}万人
          </p>
        ))}
      </div>
    );
  };

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.sectionNumber}>02</p>
        <h2 style={styles.sectionTitle}>月別推移（2017-2026年）</h2>
        <p style={styles.sectionDesc}>月ごとの訪日客数推移。4月・10月が繁忙期。※2020-2022年はコロナ影響で除外</p>
      </div>

      <div style={styles.chartWrap}>
        <div style={styles.chartTitleInline}>
          <span>訪日外客数 月別推移</span>
          <span style={styles.chartUnit}>単位: 万人</span>
        </div>

        <div style={styles.trendLegend}>
          {years.map(year => (
            <div key={year} style={{
              ...styles.legendItem,
              color: YEAR_COLORS[year],
              fontWeight: year === '2026' || year === '2025' ? 700 : 500
            }}>
              <span style={{
                ...styles.legendDot,
                background: YEAR_COLORS[year],
                width: year === '2026' ? 12 : 16,
                height: year === '2026' ? 12 : 4,
                borderRadius: year === '2026' ? '50%' : 2
              }} />
              {year}
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fontWeight: 500 }} 
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              domain={[100, 450]}
              tick={{ fontSize: 11 }}
              tickFormatter={v => v.toLocaleString()}
              axisLine={{ stroke: '#e2e8f0' }}
              label={{ value: '万人', position: 'top', offset: 10, style: { fontSize: 12, fontWeight: 600 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            {years.slice(1).reverse().map(year => (
              <Line
                key={year}
                type="monotone"
                dataKey={year}
                stroke={YEAR_COLORS[year]}
                strokeWidth={year === '2025' ? 3 : year === '2024' ? 2.5 : 2}
                dot={{ r: year === '2025' ? 5 : year === '2024' ? 4 : 3, fill: YEAR_COLORS[year] }}
                connectNulls
              />
            ))}
            <Line
              type="monotone"
              dataKey="2026"
              stroke={YEAR_COLORS['2026']}
              strokeWidth={0}
              dot={{ r: 10, fill: YEAR_COLORS['2026'], strokeWidth: 3, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>

        <p style={styles.chartSource}>出典：JNTO訪日外客統計 ※2020-2022年のデータはコロナ影響により除外</p>
      </div>
    </section>
  );
};

// ============================================================
// 장기 추이 차트
// ============================================================
const LongTermChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.map(d => ({
    ...d,
    totalMan: Math.round(d.total),
    label: d.year === '2026' ? '26.1' : String(d.year).slice(2)
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;
    const d = payload[0].payload;
    const isJan = d.year === '2026';
    return (
      <div style={styles.tooltip}>
        <p style={styles.tooltipTitle}>{isJan ? '2026年1月' : `${d.year}年`}</p>
        <p style={styles.tooltipItemWhite}>
          訪日外客数: {d.totalMan.toLocaleString()}万人{isJan ? '（1月のみ）' : ''}
        </p>
      </div>
    );
  };

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.sectionNumber}>03</p>
        <h2 style={styles.sectionTitle}>22年間の長期推移</h2>
        <p style={styles.sectionDesc}>2003年ビジット・ジャパン開始から現在まで。</p>
      </div>

      <div style={styles.chartWrap}>
        <div style={styles.chartTitleInline}>
          <span>訪日外国人数の推移（2003-2026年）</span>
          <span style={styles.chartUnit}>単位: 万人</span>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10 }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickFormatter={v => v.toLocaleString()}
              axisLine={{ stroke: '#e2e8f0' }}
              label={{ value: '万人', position: 'top', offset: 10, style: { fontSize: 12, fontWeight: 600 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="totalMan" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={entry.year === '2026' ? '#dc2626' : PHASE_COLORS[entry.phase] || '#94a3b8'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <p style={styles.chartSource}>出典：JNTO訪日外客統計</p>
      </div>

      <div style={styles.phaseRow}>
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <div key={phase} style={{...styles.phaseItem, borderLeftColor: color}}>
            <p style={styles.phaseLabel}>{phase}</p>
          </div>
        ))}
      </div>
    </section>
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
    <section style={styles.section}>
      <div style={styles.annualHero}>
        <p style={styles.annualLabel}>{year}年 訪日外国人旅行者数</p>
        <div style={styles.annualNumber}>
          <span style={styles.annualDigits}>{formatNumber(yearData.total / 10000, 0)}</span>
          <span style={styles.annualUnit}>万人</span>
        </div>
        <p style={styles.annualGrowth}>
          前年比 
          <span style={{ 
            color: parseFloat(yearData.yoy) >= 0 ? '#059669' : '#dc2626', 
            fontWeight: 700, 
            marginLeft: 8 
          }}>
            {parseFloat(yearData.yoy) >= 0 ? '+' : ''}{yearData.yoy}%
          </span>
        </p>
      </div>

      <div style={styles.rankingSection}>
        <h4 style={styles.rankingTitle}>国・地域別 年間ランキング TOP5</h4>
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
    </section>
  );
};

// ============================================================
// 12년 테이블 - 2026年1月 열 수정
// ============================================================
const TwelveYearTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  // 실제 시트 헤더와 매칭
  const displayYears = [
    { key: '2014年', label: '2014' },
    { key: '2016年', label: '2016' },
    { key: '2018年', label: '2018' },
    { key: '2019年', label: '2019' },
    { key: '2020年', label: '2020' },
    { key: '2022年', label: '2022' },
    { key: '2024年', label: '2024' },
    { key: '2025年', label: '2025' },
    { key: '2026年1月', label: '2026.1' }
  ];

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.sectionNumber}>04</p>
        <h2 style={styles.sectionTitle}>過去12年間の国別推移</h2>
        <p style={styles.sectionDesc}>主要15市場の年間訪日客数。単位：万人。</p>
      </div>

      <div style={styles.tableWrap}>
        <p style={styles.scrollHint}>→ スクロール</p>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, ...styles.thFirst}}>国・地域</th>
                {displayYears.map(y => (
                  <th key={y.key} style={{
                    ...styles.th,
                    ...(y.key === '2026年1月' ? styles.thCurrent : {})
                  }}>
                    {y.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 7).map(row => (
                <tr key={row.country}>
                  <td style={styles.tdFirst}>
                    {COUNTRY_FLAGS[row.country]} {row.country}
                  </td>
                  {displayYears.map(y => {
                    const value = row[y.key];
                    const isCovid = y.key === '2020年';
                    const isCurrent = y.key === '2026年1月';
                    return (
                      <td key={y.key} style={{
                        ...styles.td,
                        ...(isCovid ? styles.tdCovid : {}),
                        ...(isCurrent ? styles.tdCurrent : {})
                      }}>
                        {value > 0 ? formatNumber(value / 10000, 1) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  const [annualData, setAnnualData] = useState([]);
  const [longTermData, setLongTermData] = useState([]);
  const [specialData, setSpecialData] = useState([]);
  const [yearlyMonthlyData, setYearlyMonthlyData] = useState([]);
  const [countryYearlyData, setCountryYearlyData] = useState([]);

  // iframe 높이 조정
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

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 월간 데이터
        const monthly = await fetchSheetData('訪日_月間');
        if (monthly?.length > 1) {
          setMonthlyData(monthly.slice(1).map(row => ({
            month: row[0], total: parseNumber(row[1]), prevYear: parseNumber(row[2]),
            yoy: parseNumber(row[3]), prevMonth: parseNumber(row[4]), mom: parseNumber(row[5])
          })));
        }
        await delay(150);

        // 국가별 최신 월 데이터 - 訪日_国別_202601 시트 사용
        const country202601 = await fetchSheetData('訪日_国別_202601');
        if (country202601?.length > 1) {
          const headers = country202601[0]; // 国・地域, 2025年1月, 2026年1月, 伸率
          const countries = [];
          let total = 0;
          
          country202601.slice(1).forEach(row => {
            const name = row[0];
            if (name === '総数') {
              total = parseNumber(row[2]); // 2026年1月 열
            } else if (name && COUNTRIES.includes(name)) {
              countries.push({
                name: name,
                value: parseNumber(row[2]), // 2026年1月
                yoy: parseNumber(row[3])    // 伸率
              });
            }
          });
          
          countries.sort((a, b) => b.value - a.value);
          setCountryLatestData(countries);
          setCountryLatestTotal(total || countries.reduce((sum, c) => sum + c.value, 0));
        }
        await delay(150);
        
        // 연간 데이터
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
        
        // 장기 추이
        const longTerm = await fetchSheetData('訪日_長期推移');
        if (longTerm?.length > 1) {
          setLongTermData(longTerm.slice(1).map(row => ({
            year: String(row[0]), total: parseNumber(row[1]), phase: row[2]
          })));
        }
        await delay(150);
        
        // 특기사항
        const special = await fetchSheetData('訪日_特記');
        if (special?.length > 1) {
          setSpecialData(special.slice(1).map(row => ({
            month: row[0], content: row[1], country: row[2], value: parseNumber(row[3]), note: row[4]
          })).filter(s => s.month === '2026-01'));
        }
        await delay(150);

        // 연도별 월간 추이 (2017-2026)
        const yearlyMonthly = await fetchSheetData('訪日_月別推移');
        if (yearlyMonthly?.length > 1) {
          const headers = yearlyMonthly[0];
          const parsed = [];
          yearlyMonthly.slice(1).forEach(row => {
            const monthStr = row[0];
            const month = parseInt(monthStr);
            if (isNaN(month)) return;
            headers.slice(1).forEach((year, i) => {
              const value = parseNumber(row[i + 1]);
              if (value > 0) {
                parsed.push({ month, year, value });
              }
            });
          });
          setYearlyMonthlyData(parsed);
        }
        await delay(150);

        // 국가별 연간 데이터
        const countryYearly = await fetchSheetData('訪日_国別年間');
        if (countryYearly?.length > 1) {
          const headers = countryYearly[0];
          console.log('訪日_国別年間 headers:', headers);
          const parsed = countryYearly.slice(1).map(row => {
            const obj = { country: row[0] };
            headers.slice(1).forEach((year, i) => {
              obj[year] = parseNumber(row[i + 1]);
            });
            return obj;
          });
          console.log('Parsed country yearly:', parsed[0]);
          setCountryYearlyData(parsed);
        }

      } catch (err) {
        setError('データの読み込みに失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.title}>訪日外客統計</h1>
          <p style={styles.tagline}>JNTO公式データに基づく訪日外国人旅行者統計</p>
        </div>
      </header>

      <nav style={styles.nav}>
        <div style={styles.navInner}>
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
                ...styles.navLink,
                ...(activeTab === tab.id ? styles.navLinkActive : {})
              }}
            >
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
              {activeTab === 'monthly' && (
                <>
                  <HeroSection data={monthlyData} special={specialData} />
                  <CountryHorizontalBars data={countryLatestData} total={countryLatestTotal} />
                  <MonthlyTrendChart data={yearlyMonthlyData} />
                </>
              )}
              {activeTab === 'annual' && <AnnualSummary data={annualData} year="2025" />}
              {activeTab === 'trend' && <LongTermChart data={longTermData} />}
              {activeTab === 'country' && <TwelveYearTable data={countryYearlyData} />}
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
// 스타일
// ============================================================
const styles = {
  container: { 
    minHeight: '100vh', 
    backgroundColor: '#fafbfc', 
    fontFamily: '"Noto Sans JP", sans-serif', 
    color: '#0f172a', 
    lineHeight: 1.7 
  },
  
  header: { 
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', 
    color: 'white', 
    padding: '48px 0' 
  },
  headerInner: { maxWidth: 960, margin: '0 auto', padding: '0 24px' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', margin: 0 },
  tagline: { fontSize: 12, fontWeight: 300, opacity: 0.6, marginTop: 8 },
  
  nav: { 
    background: 'white', 
    borderBottom: '1px solid #e2e8f0', 
    position: 'sticky', 
    top: 0, 
    zIndex: 100 
  },
  navInner: { 
    maxWidth: 960, 
    margin: '0 auto', 
    padding: '0 24px', 
    display: 'flex', 
    gap: 40 
  },
  navLink: {
    padding: '16px 0',
    fontSize: 13,
    fontWeight: 500,
    color: '#64748b',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  navLinkActive: { 
    color: '#0369a1', 
    borderBottomColor: '#0369a1', 
    fontWeight: 600 
  },
  
  main: { padding: '64px 0 80px' },
  mainInner: { maxWidth: 960, margin: '0 auto', padding: '0 24px' },
  
  section: { marginBottom: 80 },
  sectionHeader: { marginBottom: 32 },
  sectionNumber: { 
    fontFamily: 'Inter, sans-serif', 
    fontSize: 11, 
    fontWeight: 700, 
    color: '#0369a1', 
    letterSpacing: '0.1em', 
    marginBottom: 6 
  },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 6, margin: 0 },
  sectionDesc: { fontSize: 13, color: '#64748b', margin: 0 },
  
  hero: { paddingBottom: 48, borderBottom: '1px solid #e2e8f0', marginBottom: 48 },
  heroEyebrow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  heroDate: { fontSize: 14, fontWeight: 500, color: '#475569' },
  heroBadge: { 
    fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', 
    padding: '4px 10px', borderRadius: 4, background: '#0369a1', color: 'white' 
  },
  heroNumber: { display: 'flex', alignItems: 'baseline', margin: '16px 0 24px' },
  heroDigits: { 
    fontFamily: 'Inter, sans-serif', fontSize: 96, fontWeight: 800, 
    lineHeight: 1, letterSpacing: '-0.04em', color: '#0369a1' 
  },
  heroUnit: { fontSize: 28, fontWeight: 500, color: '#94a3b8', marginLeft: 8 },
  heroCompare: { display: 'flex', gap: 48 },
  compareItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  compareLabel: { fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: '#94a3b8' },
  compareValue: { display: 'flex', alignItems: 'center', gap: 6 },
  arrow: { fontSize: 14 },
  compareNum: { fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 700 },
  compareSub: { fontSize: 12, color: '#cbd5e1' },
  insight: { marginTop: 32, padding: 24, background: '#f1f5f9', borderRadius: 8 },
  insightText: { fontSize: 15, lineHeight: 1.9, color: '#475569', margin: 0 },
  insightStrong: { fontWeight: 600, color: '#0369a1' },
  insightMark: { background: 'linear-gradient(transparent 50%, #e0f2fe 50%)', padding: '0 2px' },
  
  chartWrap: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 32 },
  chartTitleInline: { 
    fontSize: 14, fontWeight: 600, marginBottom: 16, 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
  },
  chartUnit: { 
    fontSize: 12, fontWeight: 500, color: '#64748b', 
    background: '#f1f5f9', padding: '4px 10px', borderRadius: 4 
  },
  chartSource: { 
    marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9', 
    fontSize: 11, color: '#cbd5e1' 
  },
  
  hbarList: { marginTop: 16 },
  hbarItem: { 
    display: 'flex', alignItems: 'center', padding: '12px 0', 
    borderBottom: '1px solid #f1f5f9' 
  },
  hbarRank: { width: 24, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700 },
  hbarFlag: { fontSize: 20, marginRight: 8 },
  hbarName: { width: 90, fontSize: 14, fontWeight: 600 },
  hbarBarWrap: { flex: 1, margin: '0 12px' },
  hbarBar: { height: 24, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  hbarFill: { 
    height: '100%', borderRadius: 4, display: 'flex', 
    alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 50 
  },
  hbarPercent: { 
    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, 
    color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' 
  },
  hbarValue: { 
    width: 70, textAlign: 'right', fontFamily: 'Inter, sans-serif', 
    fontSize: 14, fontWeight: 700 
  },
  hbarYoy: { 
    width: 65, textAlign: 'right', fontFamily: 'Inter, sans-serif', 
    fontSize: 12, fontWeight: 600 
  },
  
  otherMarkets: { marginTop: 32, paddingTop: 24, borderTop: '1px solid #e2e8f0' },
  otherTitle: { fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 16 },
  otherGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 24px' },
  otherItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' },
  otherFlag: { fontSize: 16 },
  otherName: { width: 90, fontSize: 13, fontWeight: 500, color: '#475569' },
  otherBar: { flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  otherFill: { height: '100%', background: '#cbd5e1', borderRadius: 4 },
  otherValue: { 
    width: 50, textAlign: 'right', fontFamily: 'Inter, sans-serif', 
    fontSize: 12, fontWeight: 600, color: '#64748b' 
  },
  otherYoy: { width: 50, textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 10 },
  
  trendLegend: { display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  legendDot: { display: 'inline-block' },
  
  // 툴팁 - 흰색 텍스트
  tooltip: { 
    background: '#0f172a', padding: 14, borderRadius: 8, 
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
  },
  tooltipTitle: { fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 8 },
  tooltipItem: { fontSize: 13, margin: '4px 0' },
  tooltipItemWhite: { fontSize: 13, margin: '4px 0', color: '#e2e8f0' },
  
  phaseRow: { display: 'flex', gap: 16, marginTop: 32, flexWrap: 'wrap' },
  phaseItem: { flex: 1, minWidth: 100, padding: '16px 0 16px 16px', borderLeft: '3px solid' },
  phaseLabel: { fontSize: 11, fontWeight: 600, color: '#64748b', margin: 0 },
  
  annualHero: { 
    textAlign: 'center', padding: 48, 
    background: 'linear-gradient(135deg, #e0f2fe 0%, white 100%)', 
    borderRadius: 16, marginBottom: 32 
  },
  annualLabel: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  annualNumber: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  annualDigits: { fontFamily: 'Inter, sans-serif', fontSize: 96, fontWeight: 800, lineHeight: 1 },
  annualUnit: { fontSize: 32, fontWeight: 600, color: '#94a3b8' },
  annualGrowth: { fontSize: 18, color: '#64748b', marginTop: 16 },
  rankingSection: { marginTop: 32 },
  rankingTitle: { fontSize: 16, fontWeight: 600, marginBottom: 16 },
  rankCard: { 
    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', 
    background: '#f8fafc', borderRadius: 8, marginBottom: 8 
  },
  rankBadge: { 
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', 
    background: '#0f172a', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 700 
  },
  rankFlag: { fontSize: 28 },
  rankName: { flex: 1, fontSize: 16, fontWeight: 500 },
  rankValue: { fontSize: 16, fontWeight: 700 },
  
  tableWrap: { marginTop: 32, position: 'relative' },
  scrollHint: { 
    position: 'absolute', right: 0, top: -24, 
    fontSize: 11, color: '#cbd5e1' 
  },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { 
    padding: '12px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, 
    letterSpacing: '0.02em', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap'
  },
  thFirst: { textAlign: 'left' },
  thCurrent: { color: '#0369a1', background: '#e0f2fe', borderRadius: '6px 6px 0 0' },
  td: { 
    padding: '12px 10px', textAlign: 'right', fontFamily: 'Inter, sans-serif', 
    color: '#64748b', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap'
  },
  tdFirst: { 
    textAlign: 'left', fontFamily: '"Noto Sans JP", sans-serif', fontWeight: 500, color: '#0f172a',
    position: 'sticky', left: 0, background: '#fafbfc', zIndex: 1
  },
  tdCovid: { color: '#dc2626', opacity: 0.5 },
  tdCurrent: { color: '#0369a1', fontWeight: 700, background: '#e0f2fe' },
  
  loadingBox: { display: 'flex', justifyContent: 'center', padding: 80 },
  spinner: { 
    width: 40, height: 40, border: '3px solid #e2e8f0', 
    borderTop: '3px solid #0369a1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' 
  },
  errorBox: { 
    padding: 16, background: '#fef2f2', border: '1px solid #fecaca', 
    borderRadius: 8, color: '#dc2626', fontSize: 14 
  },
  
  footer: { 
    maxWidth: 960, margin: '0 auto', padding: 32, 
    borderTop: '1px solid #e2e8f0', textAlign: 'center', 
    fontSize: 11, color: '#cbd5e1' 
  }
};
