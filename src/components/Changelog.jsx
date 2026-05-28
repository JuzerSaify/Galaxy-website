import React from 'react';

export default function Changelog() {
  return (
    <section className="changelog-page-container fade-in">
      <div className="changelog-content">
        <span className="section-tag">Release History</span>
        <h1 className="changelog-title">System Changelog</h1>
        <p className="changelog-subtitle">
          Track the development updates, engine optimizations, and security patches of the Knovant AI Deep Research platform.
        </p>
        
        <div className="changelog-timeline">
          <div className="changelog-item">
            <div className="changelog-version-header">
              <span className="changelog-version-badge">v1.0.0</span>
              <span className="changelog-version-date">May 27, 2026</span>
            </div>
            <h3 className="changelog-release-title">Public Launch & Local Inference Orchestrator</h3>
            <ul className="changelog-release-list">
              <li><strong>Local Ollama Orchestrator:</strong> Direct link to local inference endpoints (`http://localhost:11434`) for offline-first privacy.</li>
              <li><strong>Parallel Crawling Engine:</strong> Concurrent HTML DOM text scraping using Cheerio with aggressive asset filtering.</li>
              <li><strong>Factual Scoring Auditor:</strong> Cosine similarity checks across source datasets to compute consensus confidence.</li>
              <li><strong>Markdown & Document Exporter:</strong> Real-time rendered previews with inline SVG generation and PDF compiler integrations.</li>
              <li><strong>Google Sign-in Deep Linking:</strong> Seamless auth handoff from website callbacks back to local Electron window protocols.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
