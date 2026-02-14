/**
 * Update Sources Command
 * txt file ( Updates sources from afrom another AI)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../utils/config.js';
import SourceManager from '../utils/sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main update-sources command
 * @param {object} options - Command options
 */
export async function updateSourcesCommand(options) {
  const { file: filePath, dryRun } = options;
  
  console.log('\n📝 RepairAi Source Updater');
  console.log('='.repeat(40));
  console.log(`Source file: ${filePath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');
  
  // Check source file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Load configuration
  const cfg = config.load();
  
  // Load existing sources
  const sourceManager = new SourceManager(cfg.directories.sources_file);
  sourceManager.load();
  
  console.log(`Loaded ${sourceManager.getAll().length} existing source(s)`);
  console.log('');
  
  // Parse and merge new sources
  console.log('🔍 Parsing new sources...');
  const newSources = await sourceManager.parseAndMerge(filePath);
  
  if (newSources.length === 0) {
    console.log('ℹ️  No new sources found (all sources already exist)');
    return;
  }
  
  console.log(`Found ${newSources.length} new source(s):`);
  console.log('');
  
  for (const source of newSources) {
    console.log(`  • ${source.name}`);
    console.log(`    URL: ${source.baseUrl}`);
    console.log(`    Pattern: ${source.searchPattern}`);
    console.log(`    Type: ${source.type}`);
    console.log('');
  }
  
  if (dryRun) {
    console.log('ℹ️  DRY RUN - No changes made');
    console.log('   Run without --dry-run to save changes');
    return;
  }
  
  // Confirm before saving
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question(`Save ${newSources.length} new source(s)? [y/N] `, resolve);
  });
  
  rl.close();
  
  if (answer.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    process.exit(0);
  }
  
  // Save updated sources
  sourceManager.save();
  
  console.log(`\n✅ Updated sources saved to: ${cfg.directories.sources_file}`);
  console.log(`   New sources are disabled by default - review and enable manually`);
}

export default updateSourcesCommand;
