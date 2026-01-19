/**
 * Performance Benchmarking Laboratory
 * 
 * This module provides instrumentation and benchmarking utilities
 * for measuring and analyzing performance of the TriviaBot application.
 */

class PerformanceLab {
  constructor() {
    this.metrics = new Map();
    this.timings = new Map();
    this.marks = [];
    this.measurements = [];
    this.baseline = null;
    this.currentRun = null;
  }

  /**
   * Start timing a named operation
   */
  start(name) {
    const startTime = performance.now();
    this.timings.set(name, { start: startTime });
    console.time(name);
    
    // Performance mark for Chrome DevTools
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End timing a named operation
   */
  end(name) {
    const timing = this.timings.get(name);
    if (!timing) {
      console.warn(`Performance: No start time found for "${name}"`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timing.start;
    
    console.timeEnd(name);
    
    // Performance mark for Chrome DevTools
    if (performance.mark) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (e) {
        // Ignore if measure already exists
      }
    }

    // Store measurement
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(duration);

    this.timings.delete(name);
    return duration;
  }

  /**
   * Measure a function execution
   */
  measure(name, fn) {
    this.start(name);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure an async function execution
   */
  async measureAsync(name, fn) {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Record a custom metric
   */
  record(name, value, unit = 'ms') {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push({ value, unit, timestamp: performance.now() });
  }

  /**
   * Get statistics for a metric
   */
  getStats(name) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const durations = values.map(v => typeof v === 'number' ? v : v.value);
    const sorted = [...durations].sort((a, b) => a - b);
    
    return {
      name,
      count: durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      mean: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      total: durations.reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Get all statistics
   */
  getAllStats() {
    const stats = [];
    for (const name of this.metrics.keys()) {
      const stat = this.getStats(name);
      if (stat) stats.push(stat);
    }
    return stats;
  }

  /**
   * Save current metrics as baseline
   */
  saveBaseline(label = 'baseline') {
    this.baseline = {
      label,
      timestamp: new Date().toISOString(),
      stats: this.getAllStats(),
      metrics: new Map(this.metrics)
    };
    return this.baseline;
  }

  /**
   * Compare current metrics to baseline
   */
  compareToBaseline() {
    if (!this.baseline) {
      console.warn('No baseline saved. Call saveBaseline() first.');
      return null;
    }

    const current = this.getAllStats();
    const baseline = this.baseline.stats;
    const baselineMap = new Map(baseline.map(s => [s.name, s]));

    const comparison = current.map(currentStat => {
      const baselineStat = baselineMap.get(currentStat.name);
      if (!baselineStat) {
        return {
          name: currentStat.name,
          status: 'new',
          current: currentStat,
          baseline: null,
          improvement: null
        };
      }

      const improvement = ((baselineStat.mean - currentStat.mean) / baselineStat.mean) * 100;
      return {
        name: currentStat.name,
        status: improvement > 0 ? 'improved' : improvement < 0 ? 'regressed' : 'unchanged',
        current: currentStat,
        baseline: baselineStat,
        improvement: improvement,
        absoluteChange: currentStat.mean - baselineStat.mean
      };
    });

    return {
      baseline: this.baseline,
      current: {
        timestamp: new Date().toISOString(),
        stats: current
      },
      comparison
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.timings.clear();
    this.marks = [];
    this.measurements = [];
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      metrics: Array.from(this.metrics.entries()).map(([name, values]) => ({
        name,
        values,
        stats: this.getStats(name)
      })),
      baseline: this.baseline
    };
  }

  /**
   * Generate performance report HTML
   */
  generateReport() {
    const stats = this.getAllStats();
    const comparison = this.baseline ? this.compareToBaseline() : null;

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TriviaBot Performance Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #060CE9;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #666;
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #060CE9;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .improved {
      color: #28a745;
      font-weight: 600;
    }
    .regressed {
      color: #dc3545;
      font-weight: 600;
    }
    .unchanged {
      color: #666;
    }
    .new {
      color: #17a2b8;
    }
    .chart-container {
      margin: 30px 0;
      height: 300px;
    }
    .metric-card {
      background: #f8f9fa;
      border-left: 4px solid #060CE9;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .metric-card h3 {
      margin-bottom: 10px;
      color: #060CE9;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 10px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #060CE9;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
</head>
<body>
  <div class="container">
    <h1>TriviaBot Performance Report</h1>
    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
`;

    if (comparison) {
      html += `
    <h2>Performance Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Baseline (ms)</th>
          <th>Current (ms)</th>
          <th>Change</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
`;
      comparison.comparison.forEach(comp => {
        const statusClass = comp.status;
        const changeText = comp.improvement !== null 
          ? `${comp.improvement > 0 ? '+' : ''}${comp.improvement.toFixed(2)}%`
          : 'N/A';
        html += `
        <tr>
          <td><strong>${comp.name}</strong></td>
          <td>${comp.baseline ? comp.baseline.mean.toFixed(2) : 'N/A'}</td>
          <td>${comp.current.mean.toFixed(2)}</td>
          <td>${changeText}</td>
          <td class="${statusClass}">${comp.status.toUpperCase()}</td>
        </tr>
`;
      });
      html += `
      </tbody>
    </table>
`;
    }

    html += `
    <h2>Current Performance Metrics</h2>
`;

    stats.forEach(stat => {
      html += `
    <div class="metric-card">
      <h3>${stat.name}</h3>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${stat.mean.toFixed(2)}</div>
          <div class="stat-label">Mean (ms)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stat.median.toFixed(2)}</div>
          <div class="stat-label">Median (ms)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stat.min.toFixed(2)}</div>
          <div class="stat-label">Min (ms)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stat.max.toFixed(2)}</div>
          <div class="stat-label">Max (ms)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stat.p95.toFixed(2)}</div>
          <div class="stat-label">P95 (ms)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stat.count}</div>
          <div class="stat-label">Samples</div>
        </div>
      </div>
    </div>
`;
    });

    html += `
  </div>
</body>
</html>
`;

    return html;
  }
}

// Create global instance
window.PerformanceLab = PerformanceLab;
window.perfLab = new PerformanceLab();

// Auto-instrument common operations
if (typeof window !== 'undefined') {
  // Monitor page load performance
  window.addEventListener('load', () => {
    if (performance.timing) {
      const timing = performance.timing;
      perfLab.record('pageLoad', timing.loadEventEnd - timing.navigationStart);
      perfLab.record('domContentLoaded', timing.domContentLoadedEventEnd - timing.navigationStart);
      perfLab.record('firstPaint', timing.responseEnd - timing.navigationStart);
    }
    
    // Use PerformanceObserver for modern metrics
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              perfLab.record(entry.name, entry.duration);
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }
    }
  });
}

export default PerformanceLab;

