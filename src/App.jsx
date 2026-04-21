import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area
} from 'recharts';

// ============================================================
// 설정
// ============================================================
const SHEET_ID = '1hF1Z-3LLgzzzFwc66xVqEXszNm3qSH8Xwl6DT01dQRs';
const API_KEY = 'AIzaSyAs_UERCv_a4ZCfrZI2XvThGMFPFRkStO0';

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
// 공통 컴포넌트
// ============================================================
const SectionHeader = ({ number, title, subtitle }) => (
  <div style={styles.sectionHeader}>
    {number && <p style={styles.sectionNumber}>{number}</p>}
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
// 탭1: 最新月間 (2026년 3월)
// ============================================================
const TabMonthly = ({ monthlyData, countryData, countryTotal, countryMonthlyData, trendData, specialData }) => {
  const [showAllCountries, setShowAllCountries] = useState(false);
  
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

  return (
    <>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroEyebrow}>
          <span style={styles.heroDate}>2026年3月 訪日外客数</span>
          <span style={styles.heroBadge}>速報</span>
        </div>
        <div style={styles.heroNumber}>
          <span style={styles.heroDigits}>{formatNum(latest.total / 10000, 1)}</span>
          <span style={styles.heroUnit}>万人</span>
        </div>
        <div style={styles.heroCompare}>
          <div style={styles.compareItem}>
            <span style={styles.compareLabel}>前年同月比</span>
            <div style={styles.compareValue}>
              <span style={{...styles.arrow, color: yoy >= 0 ? '#059669' : '#dc2626'}}>{yoy >= 0 ? '▲' : '▼'}</span>
              <span style={{...styles.compareNum, color: yoy >= 0 ? '#059669' : '#dc2626'}}>{Math.abs(yoy).toFixed(1)}%</span>
            </div>
            <span style={styles.compareSub}>2025年3月: {formatMan(latest.prevYear)}</span>
          </div>
          <div style={styles.compareItem}>
            <span style={styles.compareLabel}>前月比</span>
            <div style={styles.compareValue}>
              <span style={{...styles.arrow, color: mom >= 0 ? '#059669' : '#dc2626'}}>{mom >= 0 ? '▲' : '▼'}</span>
              <span style={{...styles.compareNum, color: mom >= 0 ? '#059669' : '#dc2626'}}>{Math.abs(mom).toFixed(1)}%</span>
            </div>
            <span style={styles.compareSub}>2026年2月: {formatMan(latest.prevMonth)}</span>
          </div>
        </div>
        {specialData?.[0] && (
          <div style={styles.insight}>
            <p style={styles.insightText}>
              <strong style={styles.insightStrong}>{specialData[0].country}</strong>が
              <mark style={styles.insightMark}>{formatMan(specialData[0].value)}</mark>を記録。{specialData[0].note}
            </p>
          </div>
        )}
      </section>

      {/* 국가별 수평 바 */}
      {countryData?.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="01" title="国・地域別シェア" subtitle="2026年3月の市場別構成比" />
          <div style={styles.chartWrap}>
            <div style={styles.chartTitleInline}>
              <span>{showAllCountries ? '全市場' : 'TOP 5'}</span>
              <span style={styles.chartUnit}>総数: {formatMan(countryTotal)}</span>
            </div>
            <div style={styles.hbarList}>
              {countryData.slice(0, showAllCountries ? 10 : 5).map((c, i) => {
                const pct = countryTotal > 0 ? ((c.value / countryTotal) * 100).toFixed(1) : 0;
                const w = (c.value / countryData[0].value) * 100;
                return (
                  <div key={c.name} style={styles.hbarItem}>
                    <span style={{...styles.hbarRank, color: i < 3 ? '#0369a1' : '#94a3b8'}}>{i + 1}</span>
                    <span style={styles.hbarFlag}>{COUNTRY_FLAGS[c.name] || '🌐'}</span>
                    <span style={styles.hbarName}>{c.name}</span>
                    <div style={styles.hbarBarWrap}>
                      <div style={styles.hbarBar}>
                        <div style={{...styles.hbarFill, width: `${Math.max(w, 12)}%`, background: COUNTRY_COLORS[i]}}>
                          <span style={styles.hbarPercent}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                    <span style={styles.hbarValue}>{formatMan(c.value)}</span>
                    <span style={{...styles.hbarYoy, color: c.yoy >= 0 ? '#059669' : '#dc2626'}}>
                      {c.yoy >= 0 ? '▲' : '▼'}{Math.abs(c.yoy).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <button 
              onClick={() => setShowAllCountries(!showAllCountries)} 
              style={styles.expandBtn}
            >
              {showAllCountries ? '閉じる' : '6位以下を表示'}
            </button>
            <p style={styles.chartSource}>出典：JNTO訪日外客統計（2026年3月推計値）</p>
          </div>
        </section>
      )}

      {/* 국가별 1-3월 추이 + 누계 비교 */}
      {countryMonthlyData?.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="02" title="主要市場 2026年推移" subtitle="1-3月の月別推移と累計。前年同期比較。" />
          <div style={styles.chartWrap}>
            <div style={styles.chartTitleInline}>
              <span>TOP 8 市場</span>
              <span style={styles.chartUnit}>単位: 万人</span>
            </div>
            <div style={styles.countryTrendGrid}>
              {countryMonthlyData.slice(0, 8).map((c, i) => (
                <div key={c.name} style={styles.countryTrendCard}>
                  <div style={styles.countryTrendHeader}>
                    <span style={styles.countryTrendFlag}>{COUNTRY_FLAGS[c.name] || '🌐'}</span>
                    <span style={styles.countryTrendName}>{c.name}</span>
                    <span style={{...styles.countryTrendYoy, color: c.totalYoy >= 0 ? '#059669' : '#dc2626'}}>
                      {c.totalYoy >= 0 ? '▲' : '▼'}{Math.abs(c.totalYoy).toFixed(1)}%
                    </span>
                  </div>
                  <div style={styles.countryTrendBars}>
                    {['1月', '2月', '3月'].map(m => {
                      const val = c[m] || 0;
                      const max = Math.max(c['1月'] || 0, c['2月'] || 0, c['3月'] || 0);
                      const h = max > 0 ? (val / max) * 60 : 0;
                      return (
                        <div key={m} style={styles.countryTrendBarCol}>
                          <div style={{...styles.countryTrendBar, height: h, background: m === '3月' ? '#e53935' : '#1a1a1a'}} />
                          <span style={styles.countryTrendBarLabel}>{m.replace('月', '')}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={styles.countryTrendTotal}>
                    <span style={styles.countryTrendTotalLabel}>累計</span>
                    <span style={styles.countryTrendTotalValue}>{formatMan(c.total2026)}</span>
                  </div>
                </div>
              ))}
            </div>
            <p style={styles.chartSource}>出典：JNTO訪日外客統計（2026年1-3月推計値）</p>
          </div>
        </section>
      )}

      {/* 월별 추이 */}
      {chartData.length > 0 && (
        <section style={styles.section}>
          <SectionHeader number="03" title="月別推移（2017-2026年）" subtitle="月ごとの訪日客数推移。4月・10月が繁忙期、2月・9月が閑散期。" />
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
const TabAnnual = ({ annualData, countryYearlyData }) => {
  const [selectedYear, setSelectedYear] = useState('2025');
  if (!annualData || annualData.length === 0) return <p>データ読み込み中...</p>;
  
  const yearData = annualData.find(d => d.year === selectedYear);
  const availableYears = annualData.map(d => d.year).filter(y => parseInt(y) >= 2019 && parseInt(y) <= 2025);

  // 연도별 비교 데이터 (2019, 2023, 2024, 2025)
  const comparisonYears = ['2019', '2023', '2024', '2025'];
  const comparisonData = comparisonYears.map(y => {
    const data = annualData.find(d => d.year === y);
    return {
      year: y,
      total: data ? data.total / 10000 : 0,
      isCovidPre: y === '2019'
    };
  });
  const maxTotal = Math.max(...comparisonData.map(d => d.total));

  return (
    <section style={styles.section}>
      <SectionHeader title="年間訪日外客数" subtitle="年度別の訪日外国人旅行者数と主要市場ランキング" />
      
      {/* 연도 선택 */}
      <div style={styles.yearSelector}>
        {availableYears.map(y => (
          <button key={y} onClick={() => setSelectedYear(y)} style={{...styles.yearBtn, ...(selectedYear === y ? styles.yearBtnActive : {})}}>
            {y}年
          </button>
        ))}
      </div>

      {yearData && (
        <>
          <div style={styles.annualHero}>
            <p style={styles.annualLabel}>{selectedYear}年 訪日外国人旅行者数</p>
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

          {/* 연도별 비교 바 차트 */}
          <div style={styles.chartWrap}>
            <div style={styles.chartTitleInline}>
              <span>年間推移比較</span>
              <span style={styles.chartUnit}>単位: 万人</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 200, padding: '20px 0' }}>
              {comparisonData.map((d, i) => (
                <div key={d.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 8, color: d.year === selectedYear ? '#e53935' : '#1a1a1a' }}>
                    {formatNum(d.total, 0)}
                  </span>
                  <div style={{
                    width: '100%',
                    height: `${(d.total / maxTotal) * 160}px`,
                    background: d.year === selectedYear ? '#1a1a1a' : d.isCovidPre ? '#ff8f00' : '#90a4ae',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s'
                  }} />
                  <span style={{ marginTop: 12, fontSize: 13, fontWeight: d.year === selectedYear ? 700 : 500, color: d.year === selectedYear ? '#1a1a1a' : '#666' }}>
                    {d.year}年
                  </span>
                  {d.isCovidPre && <span style={{ fontSize: 10, color: '#ff8f00' }}>コロナ前</span>}
                </div>
              ))}
            </div>
            <p style={styles.chartSource}>※2020-2022年はコロナ影響により除外</p>
          </div>

          {/* TOP5 랭킹 - 바 차트 형태로 */}
          <div style={{ marginTop: 32 }}>
            <h4 style={styles.rankingTitle}>国・地域別 TOP5（{selectedYear}年）</h4>
            <div style={styles.chartWrap}>
              {[1, 2, 3, 4, 5].map(rank => {
                const country = yearData[`rank${rank}`];
                const value = yearData[`rank${rank}Value`];
                const maxValue = yearData.rank1Value;
                if (!country) return null;
                const barWidth = (value / maxValue) * 100;
                const barColors = ['#1a1a1a', '#455a64', '#607d8b', '#78909c', '#90a4ae'];
                return (
                  <div key={rank} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: rank < 5 ? '1px solid #e0e0e0' : 'none' }}>
                    <span style={{ width: 28, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: rank === 1 ? '#e53935' : '#999' }}>{rank}</span>
                    <span style={{ fontSize: 20, marginRight: 12 }}>{COUNTRY_FLAGS[country] || '🌐'}</span>
                    <span style={{ width: 80, fontSize: 14, fontWeight: 600 }}>{country}</span>
                    <div style={{ flex: 1, height: 24, background: '#f0f0f0', borderRadius: 4, margin: '0 16px', overflow: 'hidden' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', background: barColors[rank-1], borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 50 }}>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'white' }}>{((value / yearData.total) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, width: 80, textAlign: 'right' }}>{formatMan(value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

// ============================================================
// 탭3: 長期推移
// ============================================================
const TabLongTerm = ({ longTermData }) => {
  if (!longTermData || longTermData.length === 0) return <p>データ読み込み中...</p>;

  const chartData = longTermData.map(d => ({
    ...d,
    totalMan: Math.round(d.total),
    label: d.year === '2026' ? '26.1' : String(d.year).slice(2)
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 6500]} tickFormatter={v => v.toLocaleString()} label={{ value: '万人', position: 'top', offset: 10 }} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              const is2030 = d.year === '2030';
              return (
                <div style={styles.tooltip}>
                  <p style={styles.tooltipTitle}>{is2030 ? '2030年目標' : d.year === '2026' ? '2026年1-3月' : `${d.year}年`}</p>
                  <p style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
                    {is2030 ? '目標: ' : ''}{d.totalMan.toLocaleString()}万人{d.year === '2026' ? '（累計）' : ''}
                  </p>
                </div>
              );
            }} />
            <Bar dataKey="totalMan" radius={[4, 4, 0, 0]}>
              {chartData.map((e, i) => (
                <Cell 
                  key={i} 
                  fill={e.year === '2030' ? '#dc2626' : e.year === '2026' ? '#f97316' : PHASE_COLORS[e.phase] || '#94a3b8'} 
                  fillOpacity={e.year === '2030' ? 0.3 : 1}
                  stroke={e.year === '2030' ? '#dc2626' : 'none'}
                  strokeWidth={e.year === '2030' ? 2 : 0}
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
          <div style={{...styles.phaseItem, borderLeftColor: '#dc2626', borderStyle: 'dashed'}}>
            <p style={styles.phaseLabel}>2030年目標</p>
          </div>
        </div>
        
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
  const lineChartData = allYears.filter(y => y !== '2020年' && y !== '2021年').map(year => {
    const row = { year: year.replace('年', '') };
    top5Countries.forEach((c, i) => {
      row[c.country] = (c[year] || 0) / 10000;
    });
    return row;
  });

  return (
    <section style={styles.section}>
      <SectionHeader title="国・地域別 詳細データ" subtitle="主要15市場の年間訪日客数推移（2014年〜2026年3月）" />
      
      {/* 인사이트 카드 */}
      <div style={styles.insightCards}>
        <div style={styles.insightCard}>
          <p style={styles.insightCardLabel}>🚀 2019年→2025年 成長率TOP</p>
          <p style={styles.insightCardValue}>
            {COUNTRY_FLAGS[growthData[0]?.country]} {growthData[0]?.country}
            <span style={{ color: '#059669', marginLeft: 8 }}>+{growthData[0]?.growth.toFixed(0)}%</span>
          </p>
        </div>
        <div style={styles.insightCard}>
          <p style={styles.insightCardLabel}>👑 2025年 訪日客数1位</p>
          <p style={styles.insightCardValue}>
            {COUNTRY_FLAGS[countryYearlyData[0]?.country]} {countryYearlyData[0]?.country}
            <span style={{ color: '#0369a1', marginLeft: 8 }}>{formatMan(countryYearlyData[0]?.['2025年'])}</span>
          </p>
        </div>
        <div style={styles.insightCard}>
          <p style={styles.insightCardLabel}>📈 コロナ前超え市場数</p>
          <p style={styles.insightCardValue}>
            <span style={{ color: '#8b5cf6' }}>{countryYearlyData.filter(c => (c['2025年'] || 0) > (c['2019年'] || 0)).length}</span>
            <span style={{ color: '#64748b', fontSize: 14 }}> / 15市場</span>
          </p>
        </div>
      </div>

      {/* 전체 테이블 */}
      <div style={styles.tableWrap}>
        <div style={styles.chartTitleInline}>
          <span>主要15市場 年間推移</span>
          <span style={styles.chartUnit}>単位: 万人</span>
        </div>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, ...styles.thFirst}}>国・地域</th>
                {allYears.map(y => {
                  const isCovid = y === '2020年' || y === '2021年';
                  const is2026 = y === '2026年';
                  return (
                    <th key={y} style={{...styles.th, ...(isCovid ? styles.thCovid : {}), ...(is2026 ? styles.thCurrent : {})}}>
                      {is2026 ? '26累計' : y.replace('年', '')}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {countryYearlyData.slice(0, 15).map(row => (
                <tr key={row.country}>
                  <td style={styles.tdFirst}>{COUNTRY_FLAGS[row.country] || '🌐'} {row.country}</td>
                  {allYears.map(y => {
                    const val = row[y];
                    const isCovid = y === '2020年' || y === '2021年';
                    const is2026 = y === '2026年';
                    return (
                      <td key={y} style={{...styles.td, ...(isCovid ? styles.tdCovid : {}), ...(is2026 ? styles.tdCurrent : {})}}>
                        {val > 0 ? formatNum(val / 10000, 1) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 주요 5개국 트렌드 차트 - 범례 포함 */}
      <div style={{ marginTop: 48 }}>
        <h4 style={styles.chartSubtitle}>主要5市場の推移（2014-2025年）</h4>
        <div style={styles.chartWrap}>
          {/* 범례 */}
          <div style={styles.countryLegend}>
            {top5Countries.map((c, i) => (
              <div key={c.country} style={styles.countryLegendItem}>
                <span style={{...styles.countryLegendDot, background: top5Colors[i]}} />
                <span style={styles.countryLegendFlag}>{COUNTRY_FLAGS[c.country]}</span>
                <span style={styles.countryLegendName}>{c.country}</span>
              </div>
            ))}
          </div>
          
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => v.toFixed(0)} label={{ value: '万人', position: 'top', offset: 10 }} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                return (
                  <div style={styles.tooltip}>
                    <p style={styles.tooltipTitle}>{label}年</p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ color: p.color, fontSize: 13, margin: '4px 0', fontWeight: 600 }}>
                        {COUNTRY_FLAGS[p.name]} {p.name}: {p.value.toFixed(1)}万人
                      </p>
                    ))}
                  </div>
                );
              }} />
              {top5Countries.map((c, i) => (
                <Line 
                  key={c.country} 
                  type="monotone" 
                  dataKey={c.country} 
                  stroke={top5Colors[i]} 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: top5Colors[i] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          
          <p style={styles.chartSource}>出典：JNTO ※2020-2021年はコロナ影響により除外</p>
        </div>
      </div>
      
      {/* 시장별 성장률 비교 */}
      <div style={{ marginTop: 48 }}>
        <h4 style={styles.chartSubtitle}>コロナ前比 成長率ランキング（2019年→2025年）</h4>
        <div style={styles.chartWrap}>
          <div style={styles.growthList}>
            {growthData.slice(0, 10).map((item, i) => (
              <div key={item.country} style={styles.growthItem}>
                <span style={styles.growthRank}>{i + 1}</span>
                <span style={styles.growthFlag}>{COUNTRY_FLAGS[item.country]}</span>
                <span style={styles.growthName}>{item.country}</span>
                <div style={styles.growthBarWrap}>
                  <div style={{
                    ...styles.growthBar,
                    width: `${Math.min(Math.max(item.growth, 0) / growthData[0].growth * 100, 100)}%`,
                    background: item.growth >= 0 ? '#059669' : '#dc2626'
                  }} />
                </div>
                <span style={{...styles.growthValue, color: item.growth >= 0 ? '#059669' : '#dc2626'}}>
                  {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          <p style={styles.chartSource}>※コロナ前(2019年)と2025年の訪日客数を比較</p>
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
  const [countryMonthlyData, setCountryMonthlyData] = useState([]); // 1-3월 국가별
  const [annualData, setAnnualData] = useState([]);
  const [longTermData, setLongTermData] = useState([]);
  const [specialData, setSpecialData] = useState([]);
  const [yearlyMonthlyData, setYearlyMonthlyData] = useState([]);
  const [countryYearlyData, setCountryYearlyData] = useState([]);

  useEffect(() => {
    const sendHeight = () => {
      requestAnimationFrame(() => window.parent.postMessage({ type: 'setHeight', height: document.body.scrollHeight }, '*'));
    };
    const timer = setTimeout(sendHeight, 500);
    window.addEventListener('resize', sendHeight);
    const observer = new MutationObserver(() => setTimeout(sendHeight, 300));
    observer.observe(document.body, { childList: true, subtree: true });
    
    // WordPress에서 높이 요청 받으면 응답
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'requestHeight') {
        sendHeight();
      }
    };
    window.addEventListener('message', handleMessage);
    
    return () => { 
      clearTimeout(timer); 
      window.removeEventListener('resize', sendHeight); 
      window.removeEventListener('message', handleMessage);
      observer.disconnect(); 
    };
  }, [activeTab, loading]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 월간 데이터
        const monthly = await fetchSheet('訪日_月間');
        if (monthly?.length > 1) {
          setMonthlyData(monthly.slice(1).map(r => ({
            month: r[0], total: parseNumber(r[1]), prevYear: parseNumber(r[2]),
            yoy: parseNumber(r[3]), prevMonth: parseNumber(r[4]), mom: parseNumber(r[5])
          })));
        }
        await delay(100);

        // 국가별 2026년 3월
        const country202603 = await fetchSheet('訪日_国別_202603');
        if (country202603?.length > 1) {
          const countries = [];
          let total = 0;
          country202603.slice(1).forEach(r => {
            const name = r[0], val = parseNumber(r[2]), yoy = parseNumber(r[3]);
            if (name === '総数') total = val;
            else if (name) countries.push({ name, value: val, yoy });
          });
          countries.sort((a, b) => b.value - a.value);
          setCountryLatestData(countries);
          setCountryLatestTotal(total || countries.reduce((s, c) => s + c.value, 0));
        }
        await delay(100);

        // 국가별 1-3월 데이터 (추이용)
        const [c01, c02, c03] = await Promise.all([
          fetchSheet('訪日_国別_202601'),
          fetchSheet('訪日_国別_202602'),
          fetchSheet('訪日_国別_202603')
        ]);
        const monthlyCountries = {};
        const parseCountrySheet = (data, month) => {
          if (!data || data.length < 2) return;
          data.slice(1).forEach(r => {
            const name = r[0];
            if (!name || name === '総数') return;
            if (!monthlyCountries[name]) monthlyCountries[name] = { name };
            monthlyCountries[name][month] = parseNumber(r[2]);
            monthlyCountries[name][`${month}yoy`] = parseNumber(r[3]);
            // 전년 데이터도 저장
            monthlyCountries[name][`${month}prev`] = parseNumber(r[1]);
          });
        };
        parseCountrySheet(c01, '1月');
        parseCountrySheet(c02, '2月');
        parseCountrySheet(c03, '3月');
        // 누계 계산
        Object.values(monthlyCountries).forEach(c => {
          c.total2026 = (c['1月'] || 0) + (c['2月'] || 0) + (c['3月'] || 0);
          c.total2025 = (c['1月prev'] || 0) + (c['2月prev'] || 0) + (c['3月prev'] || 0);
          c.totalYoy = c.total2025 > 0 ? ((c.total2026 - c.total2025) / c.total2025 * 100) : 0;
        });
        const sortedMonthly = Object.values(monthlyCountries).sort((a, b) => b.total2026 - a.total2026);
        setCountryMonthlyData(sortedMonthly);
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
          setLongTermData(longTerm.slice(1).map(r => ({ year: String(r[0]), total: parseNumber(r[1]), phase: r[2] })));
        }
        await delay(100);
        
        // 특기사항
        const special = await fetchSheet('訪日_特記');
        if (special?.length > 1) {
          setSpecialData(special.slice(1).map(r => ({
            month: r[0], content: r[1], country: r[2], value: parseNumber(r[3]), note: r[4]
          })).filter(s => s.month === '2026-03'));
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
          setYearlyMonthlyData(parsed);
        }
        await delay(100);

        // 국가별 연간 (전체 연도)
        const countryYearly = await fetchSheet('訪日_国別年間');
        if (countryYearly?.length > 1) {
          const headers = countryYearly[0];
          const parsed = countryYearly.slice(1).map(r => {
            const obj = { country: r[0] };
            headers.slice(1).forEach((y, i) => { obj[y] = parseNumber(r[i + 1]); });
            return obj;
          });
          setCountryYearlyData(parsed);
        }

      } catch (err) {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tabs = [
    { id: 'monthly', label: '最新速報' },
    { id: 'detail', label: '詳細データ' }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.title}>訪日外客統計ダッシュボード</h1>
          <p style={styles.tagline}>JNTO公式データに基づく訪日外国人旅行者統計</p>
        </div>
      </header>

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
              {activeTab === 'monthly' && <TabMonthly monthlyData={monthlyData} countryData={countryLatestData} countryTotal={countryLatestTotal} countryMonthlyData={countryMonthlyData} trendData={yearlyMonthlyData} specialData={specialData} />}
              {activeTab === 'detail' && (
                <>
                  <TabAnnual annualData={annualData} />
                  <TabLongTerm longTermData={longTermData} />
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
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: '"Noto Sans JP", sans-serif', color: '#1a1a1a', lineHeight: 1.7 },
  
  header: { background: '#1a1a1a', color: 'white', padding: '28px 0' },
  headerInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '0.02em', margin: 0 },
  tagline: { fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 },
  
  nav: { background: 'white', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 100, overflowX: 'auto' },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 8 },
  navLink: { padding: '14px 16px', fontSize: 13, fontWeight: 500, color: '#666', border: 'none', borderBottom: '2px solid transparent', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  navLinkActive: { color: '#1a1a1a', borderBottomColor: '#e53935', fontWeight: 600 },
  
  main: { padding: '48px 0 80px' },
  mainInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  
  section: { marginBottom: 64 },
  sectionHeader: { marginBottom: 24 },
  sectionNumber: { fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: '#e53935', letterSpacing: '0.1em', marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 6px 0', color: '#1a1a1a' },
  sectionDesc: { fontSize: 14, color: '#666', margin: 0 },
  
  hero: { paddingBottom: 40, borderBottom: '1px solid #e0e0e0', marginBottom: 40 },
  heroEyebrow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  heroDate: { fontSize: 15, fontWeight: 500, color: '#666' },
  heroBadge: { fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 4, background: '#e53935', color: 'white' },
  heroNumber: { display: 'flex', alignItems: 'baseline', margin: '12px 0 20px' },
  heroDigits: { fontFamily: 'Inter, sans-serif', fontSize: 80, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color: '#1a1a1a' },
  heroUnit: { fontSize: 24, fontWeight: 500, color: '#999', marginLeft: 8 },
  heroCompare: { display: 'flex', gap: 40 },
  compareItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  compareLabel: { fontSize: 11, fontWeight: 500, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' },
  compareValue: { display: 'flex', alignItems: 'center', gap: 4 },
  arrow: { fontSize: 12 },
  compareNum: { fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 700 },
  compareSub: { fontSize: 12, color: '#999' },
  insight: { marginTop: 24, padding: 20, background: '#f5f5f5', borderLeft: '3px solid #e53935', borderRadius: 0 },
  insightText: { fontSize: 15, lineHeight: 1.8, color: '#333', margin: 0 },
  insightStrong: { fontWeight: 600, color: '#e53935' },
  insightMark: { background: 'linear-gradient(transparent 50%, #ffebee 50%)', padding: '0 2px' },
  
  chartWrap: { background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: 24 },
  chartTitleInline: { fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1a1a1a' },
  chartUnit: { fontSize: 12, fontWeight: 500, color: '#666', background: '#f5f5f5', padding: '4px 10px', borderRadius: 4 },
  chartSubtitle: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a1a1a' },
  chartSource: { marginTop: 16, paddingTop: 12, borderTop: '1px solid #e0e0e0', fontSize: 11, color: '#999' },
  
  // Country Trend Cards
  countryTrendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  countryTrendCard: { background: '#f8f8f8', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' },
  countryTrendHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  countryTrendFlag: { fontSize: 20 },
  countryTrendName: { flex: 1, fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  countryTrendYoy: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700 },
  countryTrendBars: { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, height: 80, marginBottom: 12 },
  countryTrendBarCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  countryTrendBar: { width: 32, borderRadius: 4, transition: 'height 0.3s' },
  countryTrendBarLabel: { fontSize: 11, color: '#999' },
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
  hbarPercent: { fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' },
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
  otherYoy: { fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600 },
  
  trendLegend: { display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' },
  legendDot: { display: 'inline-block' },
  
  tooltip: { background: '#ffffff', padding: 14, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0' },
  tooltipTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 },
  
  phaseRow: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  phaseItem: { flex: 1, minWidth: 90, padding: '12px 0 12px 12px', borderLeft: '3px solid' },
  phaseLabel: { fontSize: 11, fontWeight: 600, color: '#666', margin: 0 },
  
  milestoneSection: { marginTop: 40 },
  milestoneTitle: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a1a1a' },
  milestoneGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  milestoneCard: { padding: 16, background: '#f5f5f5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  milestoneYear: { fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 800, color: '#1a1a1a' },
  milestoneEvent: { fontSize: 13, color: '#666' },
  milestoneValue: { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  
  yearSelector: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  yearBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid #e0e0e0', borderRadius: 4, background: 'white', cursor: 'pointer', transition: 'all 0.2s', color: '#666' },
  yearBtnActive: { background: '#1a1a1a', color: 'white', borderColor: '#1a1a1a' },
  
  annualHero: { textAlign: 'center', padding: 40, background: '#f5f5f5', borderRadius: 8, marginBottom: 32 },
  annualLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  annualNumber: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  annualDigits: { fontFamily: 'Inter, sans-serif', fontSize: 72, fontWeight: 800, lineHeight: 1, color: '#1a1a1a' },
  annualUnit: { fontSize: 28, fontWeight: 600, color: '#999' },
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
  
  // 2030 Target Section
  targetSection: { marginBottom: 32 },
  targetCard: { padding: 32, background: '#1a1a1a', borderRadius: 8, color: 'white' },
  targetLabel: { fontSize: 14, color: '#999', marginBottom: 20, textAlign: 'center' },
  targetRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginBottom: 24 },
  targetItem: { textAlign: 'center' },
  targetItemLabel: { fontSize: 13, color: '#999', marginBottom: 8 },
  targetItemValue: { fontSize: 18, marginBottom: 12 },
  targetCurrent: { fontSize: 36, fontWeight: 800, color: '#ff9800' },
  targetArrow: { color: '#666', margin: '0 8px' },
  targetGoal: { fontSize: 36, fontWeight: 800, color: '#4caf50' },
  targetUnit: { fontSize: 16, color: '#999', marginLeft: 4 },
  progressBar: { height: 6, background: '#333', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #ff9800, #4caf50)', borderRadius: 3, transition: 'width 1s ease' },
  progressText: { fontSize: 13, color: '#999' },
  targetInsight: { textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid #333' },
  
  // Country Legend
  countryLegend: { display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
  countryLegendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  countryLegendDot: { width: 12, height: 12, borderRadius: '50%' },
  countryLegendFlag: { fontSize: 16 },
  countryLegendName: { fontSize: 13, fontWeight: 500, color: '#666' },
  
  // Growth List
  growthList: { display: 'flex', flexDirection: 'column', gap: 8 },
  growthItem: { display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e0e0e0' },
  growthRank: { width: 24, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: '#999' },
  growthFlag: { fontSize: 18, marginRight: 8 },
  growthName: { width: 100, fontSize: 14, fontWeight: 500, color: '#1a1a1a' },
  growthBarWrap: { flex: 1, height: 20, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginRight: 12 },
  growthBar: { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },
  growthValue: { width: 60, textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700 },
  
  tableWrap: { marginTop: 24 },
  tableScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '12px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#666', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap', background: '#f5f5f5' },
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
  
  footer: { maxWidth: 1100, margin: '0 auto', padding: 24, borderTop: '1px solid #e0e0e0', textAlign: 'center', fontSize: 11, color: '#999' }
};
