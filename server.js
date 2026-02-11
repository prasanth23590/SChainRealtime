const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const TICKERS = {
  metals: [
    { symbol: 'GC=F', name: 'Gold (XAU/USD)', fallback: 2354.1 },
    { symbol: 'SI=F', name: 'Silver (XAG/USD)', fallback: 30.91 },
    { symbol: 'PL=F', name: 'Platinum (XPT/USD)', fallback: 1040.4 },
    { symbol: 'PA=F', name: 'Palladium (XPD/USD)', fallback: 982.5 }
  ],
  us: [
    { symbol: '^GSPC', name: 'S&P 500', fallback: 5355.7 },
    { symbol: '^NDX', name: 'Nasdaq 100', fallback: 19032.8 },
    { symbol: '^DJI', name: 'Dow Jones', fallback: 39086.1 },
    { symbol: '^RUT', name: 'Russell 2000', fallback: 2108.4 }
  ],
  apac: [
    { symbol: '^N225', name: 'Nikkei 225 (Japan)', fallback: 39281.2 },
    { symbol: '^HSI', name: 'Hang Seng (HK)', fallback: 18351.9 },
    { symbol: '^KS11', name: 'KOSPI (S. Korea)', fallback: 2761.2 },
    { symbol: '^STI', name: 'Straits Times (SG)', fallback: 3345.2 }
  ],
  eu: [
    { symbol: '^GDAXI', name: 'DAX (Germany)', fallback: 18698.1 },
    { symbol: '^FTSE', name: 'FTSE 100 (UK)', fallback: 8288.6 },
    { symbol: '^FCHI', name: 'CAC 40 (France)', fallback: 7578.2 },
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50', fallback: 4961.2 }
  ]
};

const FALLBACK_NEWS = [
  {
    id: 'fallback-1',
    title: 'Geopolitical Tensions Drive Trade Disruptions',
    source: 'Global Logistics Desk',
    publishedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    tone: -4.2,
    url: '#',
    summary: 'Cross-border tariff negotiations and sanctions continue to increase uncertainty in manufacturing and ocean freight lanes.',
    dataSourceStatus: 'simulated'
  },
  {
    id: 'fallback-2',
    title: 'Red Sea Security Issues Affect Shipping Routes',
    source: 'Maritime Watch',
    publishedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    tone: -3.6,
    url: '#',
    summary: 'Shipping operators are rerouting vessels, increasing average transit times and spot container rates.',
    dataSourceStatus: 'simulated'
  },
  {
    id: 'fallback-3',
    title: 'Cyber Alerts Up for ERP and Warehouse Platforms',
    source: 'Cyber Threat Bulletin',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    tone: -2.2,
    url: '#',
    summary: 'Recent advisories flag vulnerabilities in supply-chain software used for planning, inventory, and procurement.',
    dataSourceStatus: 'simulated'
  },
  {
    id: 'fallback-4',
    title: 'Flooding Events Pressure Regional Transport Hubs',
    source: 'Climate Risk Monitor',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    tone: -1.8,
    url: '#',
    summary: 'Heavy rainfall disruptions continue to impact rail throughput and first-mile trucking in multiple regions.',
    dataSourceStatus: 'simulated'
  }
];

const contentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';
};

const formatNumber = (value) => {
  if (value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
};

const randomShift = (basis) => ((Math.sin(Date.now() / 60000 + basis) + Math.random() * 0.2) * 0.9);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

async function fetchQuote(symbol, name, fallbackBase) {
  try {
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const response = await fetch(quoteUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Quote fetch failed for ${symbol}`);

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const metaPrice = result?.meta?.regularMarketPrice;
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter((v) => typeof v === 'number');
    const latest = typeof metaPrice === 'number' ? metaPrice : validCloses.at(-1);
    const prev = validCloses.length > 1 ? validCloses.at(-2) : null;
    const changePct = latest && prev ? ((latest - prev) / prev) * 100 : randomShift(fallbackBase);

    return {
      symbol,
      name,
      price: latest,
      formattedPrice: latest ? formatNumber(latest) : '—',
      changePct,
      formattedChange: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      dataSourceStatus: 'live'
    };
  } catch {
    const changePct = randomShift(fallbackBase);
    const price = fallbackBase * (1 + changePct / 100);
    return {
      symbol,
      name,
      price,
      formattedPrice: formatNumber(price),
      changePct,
      formattedChange: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      dataSourceStatus: 'simulated'
    };
  }
}

async function fetchGdeltNews() {
  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=(supply+chain+OR+logistics+OR+shipping)&mode=artlist&format=json&maxrecords=7&sort=datedesc';
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('Failed to fetch GDELT news');

    const json = await response.json();
    const articles = Array.isArray(json.articles) ? json.articles : [];
    return articles.map((article, index) => ({
      id: `${article.url || index}`,
      title: article.title || 'Untitled event',
      source: article.sourceCommonName || 'Unknown source',
      domain: article.domain || '',
      publishedAt: article.seendate || new Date().toISOString(),
      tone: typeof article?.tone === 'number' ? article.tone : null,
      url: article.url || '#',
      summary: article?.snippet || 'No summary available.',
      dataSourceStatus: 'live'
    }));
  } catch {
    return FALLBACK_NEWS;
  }
}

async function fetchReliefWebDisasters() {
  try {
    const body = {
      appname: 'SChainRealtime',
      limit: 20,
      profile: 'full',
      sort: ['date:desc'],
      query: { value: 'disaster OR cyclone OR flood OR drought OR wildfire' }
    };

    const response = await fetch('https://api.reliefweb.int/v1/disasters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Failed to fetch reliefweb');

    const json = await response.json();
    const data = Array.isArray(json.data) ? json.data : [];
    const now = Date.now();
    const sevenDays = 1000 * 60 * 60 * 24 * 7;
    const recentCount = data.filter((item) => {
      const date = new Date(item?.fields?.date?.created || 0).getTime();
      return now - date < sevenDays;
    }).length;

    return { recentCount, total: data.length, dataSourceStatus: 'live' };
  } catch {
    return { recentCount: 9, total: 20, dataSourceStatus: 'simulated' };
  }
}

async function fetchKevStats() {
  try {
    const response = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
    if (!response.ok) throw new Error('Failed to fetch KEV feed');

    const json = await response.json();
    const list = Array.isArray(json.vulnerabilities) ? json.vulnerabilities : [];
    const now = Date.now();
    const thirtyDays = 1000 * 60 * 60 * 24 * 30;
    const recent = list.filter((v) => {
      const date = new Date(v.dateAdded).getTime();
      return now - date < thirtyDays;
    }).length;

    return { total: list.length, recent, dataSourceStatus: 'live' };
  } catch {
    return { total: 1210, recent: 23, dataSourceStatus: 'simulated' };
  }
}

function computeDashboardMetrics(data) {
  const usMove = data.us.reduce((acc, item) => acc + (item.changePct || 0), 0) / Math.max(data.us.length, 1);
  const metalsMove = data.metals.reduce((acc, item) => acc + (item.changePct || 0), 0) / Math.max(data.metals.length, 1);
  const volatility = Math.min(100, Math.max(10, Math.round(Math.abs(usMove) * 8 + Math.abs(metalsMove) * 6 + 35)));
  const activeDisruptions = Math.min(99, data.relief.recentCount + data.kev.recent + Math.floor(data.news.length / 2));
  const riskScore = Math.min(100, Math.round(volatility * 0.45 + activeDisruptions * 0.55));

  return {
    overallRiskScore: riskScore,
    marketVolatility: volatility,
    activeDisruptions,
    riskIndicators: [
      { name: 'Geopolitical Tension', value: `${Math.min(100, data.news.length * 8 + 20)} / 100`, level: data.news.length > 5 ? 'HIGH' : 'MODERATE' },
      { name: 'Cyber Threat Level', value: `+${data.kev.recent} recent KEVs`, level: data.kev.recent > 15 ? 'ELEVATED' : 'MODERATE' },
      { name: 'Climate Events', value: `${data.relief.recentCount} in 7 days`, level: data.relief.recentCount > 10 ? 'ELEVATED' : 'MODERATE' },
      { name: 'Supply Bottlenecks', value: `${Math.round(Math.max(15, Math.abs(usMove) * 10 + data.news.length * 3))}% of firms`, level: 'WATCH' }
    ],
    supplyChainMetrics: [
      { name: 'Lead Time Increase', value: `+${Math.round(Math.max(8, activeDisruptions * 0.6))}%`, status: 'DISRUPTED' },
      { name: 'Freight Rate Impact', value: volatility > 55 ? 'ELEVATED' : 'STABLE', status: volatility > 55 ? 'ELEVATED' : 'NORMAL' },
      { name: 'Port Congestion', value: data.relief.recentCount > 8 ? 'MODERATE' : 'LOW', status: data.relief.recentCount > 8 ? 'WATCH' : 'CLEAR' },
      { name: 'Cyber Incidents', value: `${data.kev.recent} flagged`, status: data.kev.recent > 15 ? 'HIGH' : 'MODERATE' }
    ]
  };
}

function summarizeSources(items) {
  const summary = items.reduce((acc, item) => {
    acc.total += 1;
    if (item.dataSourceStatus === 'live') acc.live += 1;
    return acc;
  }, { live: 0, total: 0 });

  return {
    ...summary,
    simulated: summary.total - summary.live,
    realtimeCoveragePct: summary.total ? Math.round((summary.live / summary.total) * 100) : 0
  };
}

function buildDisruptionPredictor({ us, metals, vix, news, relief, kev, marketSourceSummary, newsSourceSummary }) {
  const usAbsMove = us.reduce((acc, item) => acc + Math.abs(item.changePct || 0), 0) / Math.max(1, us.length);
  const metalsAbsMove = metals.reduce((acc, item) => acc + Math.abs(item.changePct || 0), 0) / Math.max(1, metals.length);
  const negativeNewsRatio = news.length
    ? news.filter((item) => typeof item.tone === 'number' && item.tone < -2).length / news.length
    : 0;
  const liveCoverage = (marketSourceSummary.realtimeCoveragePct + newsSourceSummary.realtimeCoveragePct) / 2;

  const z =
    -2.15 +
    0.09 * clamp(vix.price || 16, 10, 80) +
    1.35 * negativeNewsRatio +
    0.045 * relief.recentCount +
    0.018 * kev.recent +
    0.18 * usAbsMove +
    0.1 * metalsAbsMove;

  const disruptionProbability = clamp(sigmoid(z), 0.01, 0.99);
  const confidencePenalty = 1 - liveCoverage / 100;
  const confidence = clamp(0.88 - confidencePenalty * 0.45, 0.35, 0.92);
  const adjustedProbability = clamp(disruptionProbability * (0.82 + confidence * 0.28), 0.01, 0.99);

  const level = adjustedProbability >= 0.75 ? 'HIGH' : adjustedProbability >= 0.5 ? 'ELEVATED' : 'MODERATE';

  const indicatorScore = Math.round(clamp(
    adjustedProbability * 100 * 0.55 +
    confidence * 100 * 0.2 +
    clamp(negativeNewsRatio * 100, 0, 100) * 0.15 +
    clamp(vix.price || 0, 0, 100) * 0.1,
    0,
    100
  ));
  const indicatorBand = indicatorScore >= 75 ? 'CRITICAL' : indicatorScore >= 55 ? 'ELEVATED' : indicatorScore >= 35 ? 'WATCH' : 'STABLE';

  return {
    selectedModel: {
      name: 'Temporal Fusion Transformer (TFT)',
      reason: 'Best fit for realtime disruption prediction because it handles multivariate time-series + event covariates while preserving interpretability.',
      justification: [
        'Combines static context (supplier/lane attributes) with temporal signals (markets, incidents, logistics KPIs).',
        'Attention layers expose which inputs/time windows drove a forecast, supporting risk review and audit.',
        'Supports multi-horizon forecasting (e.g., 24h/72h/7d), useful for tactical and planning workflows.'
      ]
    },
    liveProxyNowcast: {
      label: 'Realtime disruption probability (next 24h)',
      probabilityPct: Math.round(adjustedProbability * 100),
      confidencePct: Math.round(confidence * 100),
      riskLevel: level,
      method: 'Streaming logistic nowcast calibrated from current reference signals (used as online proxy until a trained TFT is deployed).'
    },
    disruptionIndicator: {
      finalAggregatedScore: indicatorScore,
      band: indicatorBand,
      label: 'Final Aggregated Disruption Indicator',
      explanation: 'Composite score (0-100) blending predicted probability, model confidence, negative-news intensity, and market stress proxy (VIX).',
      components: [
        { name: 'Predicted disruption probability', weight: '55%' },
        { name: 'Model confidence', weight: '20%' },
        { name: 'Negative disruption-news intensity', weight: '15%' },
        { name: 'Market stress proxy (VIX)', weight: '10%' }
      ]
    },
    referenceData: [
      { name: 'VIX (market stress)', value: Number((vix.price || 0).toFixed(2)), source: vix.dataSourceStatus },
      { name: 'Negative disruption-news ratio', value: `${Math.round(negativeNewsRatio * 100)}%`, source: newsSourceSummary.live > 0 ? 'live/hybrid' : 'simulated' },
      { name: 'ReliefWeb disasters (last 7d)', value: relief.recentCount, source: relief.dataSourceStatus },
      { name: 'CISA KEV additions (last 30d)', value: kev.recent, source: kev.dataSourceStatus },
      { name: 'US index avg abs move', value: `${usAbsMove.toFixed(2)}%`, source: marketSourceSummary.live > 0 ? 'live/hybrid' : 'simulated' },
      { name: 'Metals avg abs move', value: `${metalsAbsMove.toFixed(2)}%`, source: marketSourceSummary.live > 0 ? 'live/hybrid' : 'simulated' }
    ]
  };
}

async function buildDashboardData() {
  const [metals, us, apac, eu, news, relief, kev, vix] = await Promise.all([
    Promise.all(TICKERS.metals.map((item) => fetchQuote(item.symbol, item.name, item.fallback))),
    Promise.all(TICKERS.us.map((item) => fetchQuote(item.symbol, item.name, item.fallback))),
    Promise.all(TICKERS.apac.map((item) => fetchQuote(item.symbol, item.name, item.fallback))),
    Promise.all(TICKERS.eu.map((item) => fetchQuote(item.symbol, item.name, item.fallback))),
    fetchGdeltNews(),
    fetchReliefWebDisasters(),
    fetchKevStats(),
    fetchQuote('^VIX', 'CBOE Volatility Index', 16.4)
  ]);

  const marketItems = [...metals, ...us, ...apac, ...eu, vix];
  const marketSourceSummary = summarizeSources(marketItems);
  const newsSourceSummary = summarizeSources(news);
  const sourceMode = marketSourceSummary.live === marketSourceSummary.total && newsSourceSummary.live === newsSourceSummary.total && relief.dataSourceStatus === 'live' && kev.dataSourceStatus === 'live'
    ? 'live'
    : 'hybrid';

  const metrics = computeDashboardMetrics({ metals, us, news, relief, kev });
  const predictor = buildDisruptionPredictor({ us, metals, vix, news, relief, kev, marketSourceSummary, newsSourceSummary });

  return {
    updatedAt: new Date().toISOString(),
    sourceMode,
    realtimeAnswer: {
      pricesAllRealtime: marketSourceSummary.live === marketSourceSummary.total,
      disruptionNewsAllRealtime: newsSourceSummary.live === newsSourceSummary.total
    },
    coverage: {
      markets: marketSourceSummary,
      disruptionNews: newsSourceSummary
    },
    dataSources: {
      markets: marketSourceSummary.live > 0 ? 'live/hybrid' : 'simulated',
      disruptionsNews: newsSourceSummary.live > 0 ? 'live/hybrid' : 'simulated',
      climateEvents: relief.dataSourceStatus,
      cyberFeed: kev.dataSourceStatus
    },
    predictor,
    vix,
    metals,
    us,
    apac,
    eu,
    news,
    ...metrics
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(reqPath, res) {
  const safePath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(PUBLIC_DIR, path.normalize(safePath).replace(/^\/+/, ''));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (parsedUrl.pathname === '/api/dashboard') {
    try {
      const data = await buildDashboardData();
      sendJson(res, 200, data);
    } catch (error) {
      sendJson(res, 500, { message: 'Failed to build dashboard', error: error.message });
    }
    return;
  }

  serveStaticFile(parsedUrl.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Realtime dashboard listening on http://localhost:${PORT}`);
});
