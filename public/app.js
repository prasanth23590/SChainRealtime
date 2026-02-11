const realtimeStatusEl = document.getElementById('realtimeStatus');
const predictorPanelEl = document.getElementById('predictorPanel');
const summaryEl = document.getElementById('summary');
const marketsEl = document.getElementById('markets');
const newsListEl = document.getElementById('newsList');
const updatedBadgeEl = document.getElementById('updatedBadge');
const template = document.getElementById('marketCardTemplate');
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function percentClass(value) {
  if (typeof value !== 'number') return '';
  if (value > 0) return 'pos';
  if (value < 0) return 'neg';
  return '';
}

function statusClass(label) {
  if (label.toUpperCase().includes('DISRUPT') || label.toUpperCase().includes('HIGH')) return 'alert';
  if (label.toUpperCase().includes('ELEVATED') || label.toUpperCase().includes('WATCH')) return 'warn';
  return 'live';
}

function sourcePillClass(sourceStatus) {
  if (sourceStatus === 'live') return 'source-pill live';
  if (sourceStatus === 'derived') return 'source-pill derived';
  return 'source-pill simulated';
}

function renderRealtimeStatus(data) {
  const pricesRealtime = data.realtimeAnswer.pricesAllRealtime;
  const newsRealtime = data.realtimeAnswer.disruptionNewsAllRealtime;

  realtimeStatusEl.innerHTML = `
    <div class="status-item ${pricesRealtime ? 'ok' : 'warn'}">
      <h3>Are all ticker prices realtime?</h3>
      <p>${pricesRealtime ? 'Yes — all current price entries are from live APIs.' : 'No — some ticker values are simulated right now.'}</p>
      <small>${data.coverage.markets.live}/${data.coverage.markets.total} live (${data.coverage.markets.realtimeCoveragePct}% realtime coverage)</small>
    </div>
    <div class="status-item ${newsRealtime ? 'ok' : 'warn'}">
      <h3>Is disruption news fully realtime?</h3>
      <p>${newsRealtime ? 'Yes — all current news items came from live feeds.' : 'No — some disruption items are fallback/simulated.'}</p>
      <small>${data.coverage.disruptionNews.live}/${data.coverage.disruptionNews.total} live (${data.coverage.disruptionNews.realtimeCoveragePct}% realtime coverage)</small>
    </div>
  `;
}

function renderPredictor(data) {
  const predictor = data.predictor;
  const nowcast = predictor.liveProxyNowcast;
  const indicator = predictor.disruptionIndicator;
  const probabilityClass = nowcast.probabilityPct >= 75 ? 'alert' : nowcast.probabilityPct >= 50 ? 'warn' : 'live';
  const indicatorClass = indicator.band === 'CRITICAL' ? 'alert' : indicator.band === 'ELEVATED' ? 'warn' : 'live';
  const legend = [
    {
      key: 'CRITICAL',
      range: '75 - 100',
      customerImpact: 'Severe disruption: fulfillment and service levels are at risk now.',
      breathingSpace: 'Little to no breathing space. Immediate contingency action needed.',
      css: 'legend-critical'
    },
    {
      key: 'ELEVATED',
      range: '55 - 74',
      customerImpact: 'Meaningful disruption pressure with delays likely.',
      breathingSpace: 'Limited breathing space. Escalate mitigation and daily checkpoints.',
      css: 'legend-elevated'
    },
    {
      key: 'WATCH',
      range: '35 - 54',
      customerImpact: 'Manageable disruption with localized risk.',
      breathingSpace: 'Some breathing space. Proactive planning recommended.',
      css: 'legend-watch'
    },
    {
      key: 'STABLE',
      range: '0 - 34',
      customerImpact: 'Low disruption risk for customers.',
      breathingSpace: 'Healthy breathing space. Continue routine monitoring.',
      css: 'legend-stable'
    }
  ];

  predictorPanelEl.innerHTML = `
    <article class="predictor-card">
      <div class="predictor-header">
        <div>
          <h2>Realtime Disruption Predictor</h2>
          <p>${nowcast.label}</p>
        </div>
        <span class="status ${probabilityClass}">${nowcast.riskLevel}</span>
      </div>
      <div class="predictor-kpis">
        <div>
          <div class="predictor-kpi-value">${indicator.finalAggregatedScore}</div>
          <div class="predictor-kpi-label">FINAL AGGREGATED DISRUPTION INDICATOR</div>
          <div class="status ${indicatorClass} predictor-mini-badge">${indicator.band}</div>
        </div>
        <div>
          <div class="predictor-kpi-value">${nowcast.probabilityPct}%</div>
          <div class="predictor-kpi-label">PREDICTED DISRUPTION RISK (24H)</div>
        </div>
        <div>
          <div class="predictor-kpi-value">${nowcast.confidencePct}%</div>
          <div class="predictor-kpi-label">MODEL CONFIDENCE</div>
        </div>
      </div>
      <p class="predictor-method"><strong>${indicator.label}:</strong> ${indicator.explanation}</p>
      <p class="predictor-method">${nowcast.method}</p>

      <div class="predictor-legend">
        <h3>Customer disruption score legend (urgency + breathing space)</h3>
        <div class="legend-grid">
          ${legend.map((item) => `
            <div class="legend-item ${item.css} ${item.key === indicator.band ? 'active' : ''}">
              <div class="legend-head">
                <strong>${item.key}</strong>
                <span>${item.range}</span>
              </div>
              <p><strong>Customer impact:</strong> ${item.customerImpact}</p>
              <p><strong>Breathing space:</strong> ${item.breathingSpace}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="predictor-model">
        <h3>Best-fit production model: ${predictor.selectedModel.name}</h3>
        <p>${predictor.selectedModel.reason}</p>
        <ul>
          ${predictor.selectedModel.justification.map((item) => `<li>${item}</li>`).join('')}
        </ul>
        <h3>Indicator composition</h3>
        <ul>
          ${indicator.components.map((item) => `<li>${item.name} — ${item.weight}</li>`).join('')}
        </ul>
      </div>

      <div class="predictor-reference">
        <h3>Reference data used by predictor</h3>
        <div class="reference-grid">
          ${predictor.referenceData.map((ref) => `
            <div class="reference-item">
              <div class="reference-name">${ref.name}</div>
              <div class="reference-value">${ref.value}</div>
              <div class="${sourcePillClass(ref.source === 'live/hybrid' ? 'derived' : ref.source)}">${ref.source.toUpperCase()}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}

function renderSummary(data) {
  summaryEl.innerHTML = `
    <div class="summary-item">
      <div class="summary-value">${data.overallRiskScore}</div>
      <div class="summary-label">OVERALL RISK SCORE</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${data.marketVolatility}</div>
      <div class="summary-label">MARKET VOLATILITY</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${data.activeDisruptions}</div>
      <div class="summary-label">ACTIVE DISRUPTIONS</div>
    </div>
  `;
}

function renderMarketCard(title, items, badgeLabel = 'LIVE') {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector('.card');
  const h3 = fragment.querySelector('h3');
  const badge = fragment.querySelector('.status');
  const rows = fragment.querySelector('.rows');

  h3.textContent = title;
  badge.textContent = badgeLabel;
  badge.className = `status ${statusClass(badgeLabel)}`;

  rows.innerHTML = items.map((item) => {
    const val = item.formattedPrice || item.value || '—';
    const change = item.formattedChange || item.status || item.level || '';
    const className = percentClass(item.changePct);
    return `
      <div class="row">
        <div class="name">${item.name}</div>
        <div class="price">${val}</div>
        <div class="chg ${className}">${change}</div>
        <div class="${sourcePillClass(item.dataSourceStatus)}">${item.dataSourceStatus === 'live' ? 'LIVE' : item.dataSourceStatus === 'derived' ? 'DERIVED' : 'SIM'}</div>
      </div>
    `;
  }).join('');

  marketsEl.appendChild(card);
}

function renderNews(news) {
  newsListEl.innerHTML = '';

  news.forEach((article) => {
    const tone = typeof article.tone === 'number' ? article.tone : 0;
    const impactClass = tone < -2 ? 'high' : tone > 1 ? 'low' : '';
    const item = document.createElement('article');
    item.className = `news-item ${impactClass}`;
    item.innerHTML = `
      <div class="news-row-top">
        <h4>${article.title}</h4>
        <span class="${sourcePillClass(article.dataSourceStatus)}">${article.dataSourceStatus === 'live' ? 'LIVE' : 'SIMULATED'}</span>
      </div>
      <p class="news-meta">${article.source} • ${new Date(article.publishedAt || Date.now()).toLocaleString()} • tone ${tone.toFixed(1)}</p>
      <p class="news-summary">${article.summary}</p>
      <a class="news-link" href="${article.url}" target="_blank" rel="noopener noreferrer">Read source →</a>
    `;
    newsListEl.appendChild(item);
  });
}

async function loadDashboard() {
  try {
    updatedBadgeEl.textContent = 'Updating…';
    const response = await fetch('/api/dashboard');
    if (!response.ok) throw new Error('failed');

    const data = await response.json();
    renderRealtimeStatus(data);
    renderPredictor(data);
    renderSummary(data);

    marketsEl.innerHTML = '';
    renderMarketCard('Precious Metals', data.metals, 'Live Prices');
    renderMarketCard('US Markets', data.us, 'Live Prices');
    renderMarketCard('Asia-Pacific Markets', data.apac, 'Live Prices');
    renderMarketCard('European Markets', data.eu, 'Live Prices');
    renderMarketCard('Risk Indicators', data.riskIndicators.map((item) => ({ ...item, dataSourceStatus: 'derived' })), data.overallRiskScore > 70 ? 'Elevated' : 'Watch');
    renderMarketCard('Supply Chain Metrics', data.supplyChainMetrics.map((item) => ({ ...item, dataSourceStatus: 'derived' })), data.activeDisruptions > 20 ? 'Disrupted' : 'Stable');

    renderNews(data.news);
    updatedBadgeEl.textContent = `Updated ${new Date(data.updatedAt).toLocaleTimeString()} • ${data.sourceMode.toUpperCase()}`;
  } catch {
    updatedBadgeEl.textContent = 'Data error';
    realtimeStatusEl.innerHTML = '<p class="error-text">Unable to load source coverage.</p>';
    predictorPanelEl.innerHTML = '<p class="error-text">Unable to load predictor context.</p>';
    newsListEl.innerHTML = '<p class="error-text">Unable to load live data sources right now.</p>';
  }
}

loadDashboard();
setInterval(loadDashboard, REFRESH_INTERVAL_MS);
