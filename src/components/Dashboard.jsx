import React from 'react';
import { Activity, Terminal, Cpu, Monitor, RefreshCw } from 'lucide-react';

export default function Dashboard({
  user,
  loading,
  activeDashboardTab,
  setActiveDashboardTab,
  metrics,
  fetchUserUsage
}) {

  // Render Line Area SVG Chart for weekly tokens usage
  const renderWeeklyTrendChart = () => {
    const trend = metrics.weeklyTrend;
    if (!trend || trend.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '12px', gap: '8px' }}>
          <Activity size={24} style={{ opacity: 0.3 }} />
          <span>No Ingestion Data Available</span>
        </div>
      );
    }

    const maxVal = Math.max(...trend.map(t => t.tokens), 50000);
    
    const w = 400;
    const h = 140;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 10;
    const paddingBottom = 20;

    const chartWidth = w - paddingLeft - paddingRight;
    const chartHeight = h - paddingTop - paddingBottom;

    const points = trend.map((t, idx) => {
      const x = paddingLeft + (idx / (trend.length - 1)) * chartWidth;
      const y = h - paddingBottom - (t.tokens / maxVal) * chartHeight;
      return { x, y, val: t.tokens, day: t.day.split(':')[0] };
    });

    const linePath = points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    }, '');

    const areaPath = linePath + 
      `L ${points[points.length - 1].x.toFixed(1)} ${(h - paddingBottom).toFixed(1)} ` +
      `L ${points[0].x.toFixed(1)} ${(h - paddingBottom).toFixed(1)} Z`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + ratio * chartHeight;
          const labelVal = Math.round(maxVal * (1 - ratio));
          const labelStr = labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal;
          return (
            <g key={idx}>
              <line className="chart-svg-grid-line" x1={paddingLeft} y1={y} x2={w - paddingRight} y2={y} />
              <text className="chart-svg-text" x={paddingLeft - 8} y={y + 3} textAnchor="end">{labelStr}</text>
            </g>
          );
        })}

        {points.map((p, idx) => (
          <text key={idx} className="chart-svg-text" x={p.x} y={h - 4} textAnchor="middle">{p.day}</text>
        ))}

        <path className="chart-svg-area" d={areaPath} />
        <path className="chart-svg-line chart-svg-line-animated" d={linePath} />

        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={3} fill="#0F172A" stroke="#FFFFFF" strokeWidth={1} style={{ cursor: 'pointer' }}>
            <title>{p.day}: {p.val.toLocaleString()} tokens</title>
          </circle>
        ))}

        <line className="chart-svg-axis-line" x1={paddingLeft} y1={h - paddingBottom} x2={w - paddingRight} y2={h - paddingBottom} />
      </svg>
    );
  };

  // Render Horizontal Progress Bar SVG Chart for model runs
  const renderModelRunsChart = () => {
    const runs = metrics.modelRuns;
    if (!runs || runs.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '12px', gap: '8px' }}>
          <Cpu size={24} style={{ opacity: 0.3 }} />
          <span>No Model Runs Available</span>
        </div>
      );
    }

    const maxCount = Math.max(...runs.map(r => r.count), 1);
    
    const w = 400;
    const h = 140;
    const barHeight = 16;
    const barGap = 20;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {runs.map((r, idx) => {
          const y = 15 + idx * (barHeight + barGap);
          const barWidth = 240 * (r.count / maxCount);
          return (
            <g key={idx}>
              <text className="chart-svg-text" x={80} y={y + 12} textAnchor="end" style={{ fontWeight: '500' }}>
                {r.model.split(':')[0]}
              </text>
              <rect className="chart-svg-bar-bg" x={90} y={y} width={240} height={barHeight} rx={2} />
              <rect className="chart-svg-bar" x={90} y={y} width={barWidth} height={barHeight} rx={2} />
              <text className="chart-svg-text" x={95 + barWidth} y={y + 12} style={{ fontWeight: '600' }}>
                {r.count} runs
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="dashboard-container fade-in">
      
      {/* User Profile Header */}
      <div className="dashboard-header">
        <div className="dashboard-avatar">
          {(user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="dashboard-user-info">
          <span className="dashboard-email">{user.email}</span>
          <span className="dashboard-uid">User ID: {user.id}</span>
        </div>
      </div>

      <div className="dashboard-split-layout">
        
        {/* Left Sidebar Tabs */}
        <div className="dashboard-tab-sidebar">
          <button 
            onClick={() => setActiveDashboardTab('overview')} 
            className={`dashboard-tab-btn ${activeDashboardTab === 'overview' ? 'active' : ''}`}
          >
            <Activity size={15} />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveDashboardTab('queries')} 
            className={`dashboard-tab-btn ${activeDashboardTab === 'queries' ? 'active' : ''}`}
          >
            <Terminal size={15} />
            <span>Intelligence Runs</span>
          </button>
          <button 
            onClick={() => setActiveDashboardTab('models')} 
            className={`dashboard-tab-btn ${activeDashboardTab === 'models' ? 'active' : ''}`}
          >
            <Cpu size={15} />
            <span>Model Analytics</span>
          </button>
          <button 
            onClick={() => setActiveDashboardTab('download')} 
            className={`dashboard-tab-btn ${activeDashboardTab === 'download' ? 'active' : ''}`}
          >
            <Monitor size={15} />
            <span>Download Client</span>
          </button>

          <div className="sidebar-sync-status">
            <span className="sync-dot active"></span>
            <span className="sync-text">Realtime Synced</span>
          </div>
        </div>

        {/* Right Pane Content */}
        <div className="dashboard-content-pane">
          {activeDashboardTab === 'overview' && (
            <div className="tab-pane-content fade-in">
              <div className="pane-header">
                <h2 className="pane-title">Performance Overview</h2>
                <span className="pane-subtitle">Live real-time aggregation of local deep research session telemetry</span>
              </div>

              {/* Clean Minimalist Stats (No card borders, pure numbers) */}
              <div className="dashboard-stats-minimal">
                <div className="stat-item-minimal">
                  <span className="stat-label">Deep Research Sessions</span>
                  <span className="stat-value">{metrics.stats.queryCount}</span>
                  <span className="stat-desc">Completed research sequences executed on your nodes</span>
                </div>
                <div className="stat-item-minimal">
                  <span className="stat-label">Estimated Tokens Ingested</span>
                  <span className="stat-value">{metrics.stats.totalTokens.toLocaleString()}</span>
                  <span className="stat-desc">Contextual tokens loaded through local LLM architectures</span>
                </div>
              </div>

              {/* Ingestion Trend */}
              <div className="chart-wrapper-minimal">
                <h3 className="chart-title">Contextual Ingestion Volume</h3>
                <span className="chart-subtitle">7-day volume trend of loaded token contexts</span>
                <div className="chart-container-minimal">
                  {renderWeeklyTrendChart()}
                </div>
              </div>
            </div>
          )}

          {activeDashboardTab === 'queries' && (
            <div className="tab-pane-content fade-in">
              <div className="pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="pane-title">Recent Intelligence Runs</h2>
                  <span className="pane-subtitle">Secure, local deep research session runs synced from desktop application</span>
                </div>
                <button onClick={fetchUserUsage} className="sync-btn-minimal" title="Force sync database telemetry">
                  <RefreshCw size={13} className={loading ? "spin" : ""} />
                  <span>Sync telemetry</span>
                </button>
              </div>

              <div className="queries-table-container-minimal">
                <table className="queries-table-minimal">
                  <thead>
                    <tr>
                      <th>Research Query</th>
                      <th>Model Name</th>
                      <th>Est. Tokens</th>
                      <th>Web Sources</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentQueries.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="table-empty-cell">
                          No research runs logged. Open the Knovant desktop client and initiate a deep research run to sync.
                        </td>
                      </tr>
                    ) : (
                      metrics.recentQueries.map((q, idx) => (
                        <tr key={idx}>
                          <td className="query-text-cell" title={q.query}>{q.query}</td>
                          <td><span className="model-badge">{q.selected_model.split(':')[0]}</span></td>
                          <td>{q.tokens_estimated.toLocaleString()}</td>
                          <td>{q.sources_count || 0} sources</td>
                          <td>{new Date(q.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeDashboardTab === 'models' && (
            <div className="tab-pane-content fade-in">
              <div className="pane-header">
                <h2 className="pane-title">Model Utilization</h2>
                <span className="pane-subtitle">Telemetry analytics mapping local LLM model selection and run count share</span>
              </div>

              <div className="chart-wrapper-minimal" style={{ maxWidth: '560px' }}>
                <h3 className="chart-title">Model Selection Share</h3>
                <span className="chart-subtitle">Run frequency count distribution map</span>
                <div className="chart-container-minimal">
                  {renderModelRunsChart()}
                </div>
              </div>
            </div>
          )}

          {activeDashboardTab === 'download' && (
            <div className="tab-pane-content fade-in">
              <div className="pane-header">
                <h2 className="pane-title">Standalone Client Download</h2>
                <span className="pane-subtitle">Download and set up the premium local-first AI deep research desktop app</span>
              </div>

              <div className="download-guide-container">
                <p className="download-intro-text">
                  To run local LLMs, parse deep web sources, compile comprehensive reports, and sync stats to your profile in real-time, install the standalone desktop client.
                </p>

                <div className="setup-steps-list">
                  <div className="setup-step">
                    <span className="step-num">01</span>
                    <div className="step-content">
                      <span className="step-heading">Download Installer</span>
                      <span className="step-description">Click below to fetch the desktop application installer executable (`Knovant Setup 1.0.0.exe`).</span>
                    </div>
                  </div>
                  <div className="setup-step">
                    <span className="step-num">02</span>
                    <div className="step-content">
                      <span className="step-heading">Run Setup</span>
                      <span className="step-description">Launch the installer. If Windows prompts with smart-screen, select "Run anyway". The app installs cleanly under your user profile.</span>
                    </div>
                  </div>
                  <div className="setup-step">
                    <span className="step-num">03</span>
                    <div className="step-content">
                      <span className="step-heading">Authenticate & Sync</span>
                      <span className="step-description">Open the application, sign in with your email `{user.email}`, and your metrics will automatically synchronize in real-time.</span>
                    </div>
                  </div>
                </div>

                <div className="download-action-row">
                  <a href="/Knovant.Setup.1.0.0.exe" className="btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', borderRadius: '4px', fontSize: '13px', width: 'fit-content', fontWeight: '500' }}>
                    <Monitor size={15} />
                    <span>Download Standalone Client (.exe)</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
