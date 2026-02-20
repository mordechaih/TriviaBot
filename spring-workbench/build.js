#!/usr/bin/env node
/**
 * Spring Workbench Build Script
 * Bundles Lucide icons and Motion.dev into a single distributable file
 */

import * as esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
mkdirSync(join(__dirname, 'dist'), { recursive: true });

// Build configuration
const buildConfig = {
  entryPoints: [join(__dirname, 'src/index.js')],
  bundle: true,
  outfile: join(__dirname, 'dist/spring-workbench.bundle.js'),
  format: 'iife',
  globalName: 'SpringWorkbench',
  minify: !isWatch,
  sourcemap: isWatch,
  target: ['es2020'],
  // Tree-shake unused exports
  treeShaking: true,
  // Define for dead code elimination
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"'
  },
  banner: {
    js: `/**
 * Spring Workbench v1.0.0
 * Interactive spring animation configuration tool
 * 
 * Bundled dependencies:
 * - Motion.dev (spring physics)
 * - Lucide (icons)
 * 
 * Usage: SpringWorkbench.init({ animations: [...] })
 */`
  }
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildConfig);
      await ctx.watch();
      console.log('👀 Watching for changes...');
    } else {
      const result = await esbuild.build(buildConfig);
      console.log('✅ Build complete: dist/spring-workbench.bundle.js');
      if (result.metafile) {
        const outputs = Object.keys(result.metafile.outputs);
        outputs.forEach(output => {
          const size = result.metafile.outputs[output].bytes;
          console.log(`   ${output}: ${(size / 1024).toFixed(2)} KB`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();

