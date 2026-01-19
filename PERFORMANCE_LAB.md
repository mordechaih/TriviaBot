# TriviaBot Performance Laboratory

## Overview

This performance laboratory provides comprehensive instrumentation and benchmarking tools for measuring and optimizing TriviaBot's performance.

## Components

### 1. Performance Measurement Module (`js/performance.js`)

A comprehensive performance measurement class that provides:
- Timing utilities with `console.time` and Performance API markers
- Statistical analysis (mean, median, min, max, P95, P99)
- Baseline comparison capabilities
- HTML report generation

### 2. Instrumented Code

All critical paths in the application have been instrumented:
- `game-display.js`: Game loading, rendering, DOM manipulation
- `game-list.js`: Game list loading, filtering, rendering

### 3. Benchmark Runner (`benchmark.html`)

Interactive benchmark interface for:
- Running baseline benchmarks
- Saving baseline metrics
- Running comparisons
- Exporting reports

## Usage

### Capturing Baseline Metrics

1. **Automatic Baseline Capture**:
   - Open `game.html?id=game-2026-01-18` in Chrome DevTools
   - Open Console
   - Run: `perfLab.saveBaseline('initial-baseline')`
   - Metrics are automatically captured during page load

2. **Manual Benchmark**:
   - Open `benchmark.html`
   - Click "Run Baseline Benchmark"
   - Click "Save Baseline"

### Running Comparisons

1. Make code changes
2. Reload the page or run benchmark again
3. Run: `perfLab.compareToBaseline()` in console
   - Or use the benchmark.html interface

### Viewing Performance Data

**In Console:**
```javascript
// View all stats
perfLab.getAllStats()

// View specific metric
perfLab.getStats('loadGame')

// Compare to baseline
perfLab.compareToBaseline()

// Export data
perfLab.export()
```

**HTML Report:**
- Click "View HTML Report" in benchmark.html
- Or run: `perfLab.generateReport()` and save the HTML

### Chrome DevTools Integration

All performance markers are automatically available in Chrome DevTools:
1. Open Chrome DevTools
2. Go to Performance tab
3. Record a performance profile
4. Look for custom markers (e.g., `loadGame-start`, `renderGame-end`)

## Critical Paths Instrumented

### Game Display (`game-display.js`)
- `loadGame`: Total game loading time
- `fetchGameData`: Network fetch time
- `parseGameData`: JSON parsing time
- `renderGame`: Total rendering time
- `renderRounds`: Round rendering time
- `createRoundElement`: Individual round creation
- `createQuestionElement`: Individual question creation
- `markGameAsPlayed`: Status update time

### Game List (`game-list.js`)
- `loadGames`: Total game list loading
- `fetchGamesIndex`: Index file fetch
- `fetchAllGames`: Parallel game fetching
- `sortGames`: Sorting operation
- `renderGames`: List rendering
- `filterGames`: Filtering operation
- `createGameCard`: Individual card creation
- `loadPlayedStatus`: Status loading

## Performance Metrics

Each metric tracks:
- **Count**: Number of samples
- **Min/Max**: Fastest/slowest execution
- **Mean**: Average execution time
- **Median**: Middle value
- **P95**: 95th percentile
- **P99**: 99th percentile
- **Total**: Sum of all executions

## Best Practices

1. **Run multiple iterations**: Performance can vary, so run benchmarks multiple times
2. **Clear metrics between runs**: Use `perfLab.clear()` before new benchmarks
3. **Save baseline early**: Capture baseline before making changes
4. **Compare systematically**: Test one change at a time
5. **Use Chrome DevTools**: Combine with Performance tab for deeper analysis

## Troubleshooting

**No metrics appearing?**
- Check that `js/performance.js` is loaded before other scripts
- Verify instrumentation is in place
- Check browser console for errors

**Baseline comparison not working?**
- Ensure baseline was saved: `perfLab.baseline !== null`
- Clear and re-run if needed

**Performance markers not in DevTools?**
- Ensure Performance API is supported (modern browsers)
- Check that markers are being created (look in console)

## Next Steps

After capturing baseline:
1. Identify top 3-5 slowest operations
2. Create hypotheses about bottlenecks
3. Research optimization techniques
4. Implement fixes one at a time
5. Measure improvements
6. Generate final report

