#!/usr/bin/env node

/**
 * RepairAi Scraper - CLI Entry Point
 * AI-powered web scraper for enriching RepairAi-files with repair documentation
 * 
 * Interactive Mode:
 *   node src/index.js (starts interactive prompts)
 * 
 * Command Line Mode:
 *   node src/index.js scrape --model "Samsung A310F"
 *   node src/index.js scrape --model "Samsung A310F" --mode ai
 *   node src/index.js analyze-images --folder ./data/images
 *   node src/index.js update-sources --file ./new-sources.txt
 *   node src/index.js integrate --source staging/samsung-a310f/
 *   node src/index.js index --repo ../repairai-files
 */

import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Import commands
import { scrapeCommand } from './commands/scrape.js';
import { analyzeImagesCommand } from './commands/analyze-images.js';
import { updateSourcesCommand } from './commands/update-sources.js';
import { integrateCommand } from './commands/integrate.js';
import { indexCommand } from './commands/index.js';
import { extractModels } from './commands/extract-models.js';

// Interactive prompt helper
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Print colored banner
function printBanner() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🤖 RepairAi Scraper - AI-Powered Data Enrichment      ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
}

// Print menu options
function printMenu() {
  console.log('📋 Available Actions:\n');
  console.log('   1. 🔍 Scrape repair data for a device');
  console.log('   2. 🖼️  Analyze images with AI');
  console.log('   3. 📝 Add new sources from file');
  console.log('   4. 🔄 Integrate staged data');
  console.log('   5. 📑 Generate repository index');
  console.log('   6. 📱 Extract popular device models');
  console.log('   7. ⚙️  Configure API keys');
  console.log('   8. ℹ️  Show current configuration');
  console.log('   9. 🚪 Exit\n');
}

// Interactive scrape flow
async function interactiveScrape() {
  console.log('\n📱 Scraping Mode');
  console.log('─'.repeat(40));
  
  const model = await question('Enter device model (e.g., "Samsung A310F"): ');
  if (!model.trim()) {
    console.log('❌ No model entered');
    return;
  }
  
  console.log('\nSelect processing mode:');
  console.log('   1. Raw - Save raw HTML and data for review');
  console.log('   2. AI - Process with AI (requires API key)');
  
  const modeChoice = await question('Choice [1/2]: ');
  const mode = modeChoice === '2' ? 'ai' : 'raw';
  
  console.log('\nSelect source (or press Enter for all):');
  console.log('   ifixit, gsmarena, samsung-support, mobilezion, etc.');
  const source = await question('Source (optional): ');
  
  const options = {
    model: model.trim(),
    mode,
    source: source.trim() || null,
    output: './data/staging'
  };
  
  console.log('\n✅ Starting scrape...');
  await scrapeCommand(options);
}

// Interactive image analysis
async function interactiveAnalyzeImages() {
  console.log('\n🖼️  Image Analysis Mode');
  console.log('─'.repeat(40));
  
  const folder = await question('Enter folder path with images: ');
  if (!folder.trim()) {
    console.log('❌ No folder entered');
    return;
  }
  
  const prompt = await question('Enter analysis prompt (or press Enter for default): ');
  
  const options = {
    folder: folder.trim(),
    prompt: prompt.trim() || 'Describe this repair image in detail.',
    model: 'gemini-pro-vision'
  };
  
  console.log('\n✅ Starting analysis...');
  await analyzeImagesCommand(options);
}

// Interactive source update
async function interactiveUpdateSources() {
  console.log('\n📝 Source Update Mode');
  console.log('─'.repeat(40));
  
  const file = await question('Enter path to sources txt file: ');
  if (!file.trim()) {
    console.log('❌ No file entered');
    return;
  }
  
  const dryRun = await question('Dry run? [y/N]: ');
  
  const options = {
    file: file.trim(),
    dryRun: dryRun.toLowerCase() === 'y'
  };
  
  console.log('\n✅ Processing sources...');
  await updateSourcesCommand(options);
}

// Interactive integrate flow
async function interactiveIntegrate() {
  console.log('\n🔄 Integration Mode');
  console.log('─'.repeat(40));
  
  const source = await question('Enter path to staged data: ');
  if (!source.trim()) {
    console.log('❌ No source path entered');
    return;
  }
  
  const manufacturer = await question('Enter manufacturer name (e.g., samsung): ');
  const model = await question('Enter model name (e.g., a310f): ');
  const approve = await question('Auto-approve? [y/N]: ');
  
  const options = {
    source: source.trim(),
    manufacturer: manufacturer.trim(),
    model: model.trim(),
    approve: approve.toLowerCase() === 'y',
    backup: true
  };
  
  console.log('\n✅ Starting integration...');
  await integrateCommand(options);
}

// Interactive index generation
async function interactiveIndex() {
  console.log('\n📑 Index Generation Mode');
  console.log('─'.repeat(40));
  
  const repo = await question('Enter repository path [../repairai-files]: ');
  const format = await question('Format [json/markdown]: ');
  
  const options = {
    repo: repo.trim() || '../repairai-files',
    format: format.trim() || 'json'
  };
  
  console.log('\n✅ Generating index...');
  await indexCommand(options);
}

// Interactive extract models
async function interactiveExtractModels() {
  console.log('\n📱 Extract Device Models Mode');
  console.log('─'.repeat(40));
  
  console.log('\nThis will create directory structures for 100+ popular device models.');
  console.log('Each device will get:');
  console.log('   - Directory structure (manufacturer/model/boardview/)');
  console.log('   - README.md with device info');
  console.log('   - SEARCH_GUIDE.md with search resources');
  console.log('   - Placeholder boardview.json');
  
  const manufacturers = await question('\nEnter manufacturers (comma-separated, or press Enter for all): ');
  const confirm = await question('Continue? [Y/n]: ');
  
  if (confirm.toLowerCase() === 'n') {
    console.log('❌ Cancelled');
    return;
  }
  
  const options = {};
  if (manufacturers.trim()) {
    options.manufacturers = manufacturers.split(',').map(m => m.trim().toLowerCase());
  }
  
  console.log('\n✅ Extracting models...');
  await extractModels(options);
}

// Configure API keys
async function interactiveConfig() {
  console.log('\n⚙️  API Key Configuration');
  console.log('─'.repeat(40));
  
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  console.log('\nCurrent status:');
  console.log(`   OpenRouter: ${process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Not set'}`);
  console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not set'}`);
  
  console.log('\nEnter new API keys (press Enter to skip):');
  
  const openrouterKey = await question('OpenRouter API Key: ');
  const geminiKey = await question('Gemini API Key: ');
  
  let newEnvContent = envContent;
  
  if (openrouterKey.trim()) {
    newEnvContent += `\nOPENROUTER_API_KEY=${openrouterKey.trim()}`;
  }
  if (geminiKey.trim()) {
    newEnvContent += `\nGEMINI_API_KEY=${geminiKey.trim()}`;
  }
  
  if (openrouterKey.trim() || geminiKey.trim()) {
    fs.writeFileSync(envPath, newEnvContent.trim(), 'utf-8');
    console.log('\n✅ API keys saved to .env file');
  } else {
    console.log('\n⚠️  No changes made');
  }
}

// Show configuration
function showConfig() {
  console.log('\n⚙️  Current Configuration');
  console.log('─'.repeat(40));
  
  const config = {
    'OpenRouter API': process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Not set',
    'Gemini API': process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not set',
  };
  
  for (const [key, value] of Object.entries(config)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
}

// Main interactive loop
async function interactiveMode() {
  printBanner();
  
  // Check for API keys
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('⚠️  API keys not configured. Let\'s set them up first!\n');
    await interactiveConfig();
  }
  
  while (true) {
    printMenu();
    const choice = await question('Select an action [1-9]: ');
    
    switch (choice.trim()) {
      case '1':
        await interactiveScrape();
        break;
      case '2':
        await interactiveAnalyzeImages();
        break;
      case '3':
        await interactiveUpdateSources();
        break;
      case '4':
        await interactiveIntegrate();
        break;
      case '5':
        await interactiveIndex();
        break;
      case '6':
        await interactiveExtractModels();
        break;
      case '7':
        await interactiveConfig();
        break;
      case '8':
        showConfig();
        break;
      case '9':
      case 'exit':
      case 'quit':
        console.log('\n👋 Goodbye! Happy repairing!\n');
        rl.close();
        process.exit(0);
      default:
        console.log('\n❌ Invalid choice. Please try again.\n');
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

// CLI program setup
const program = new Command();

program
  .name('repair-ai-scraper')
  .description('AI-powered web scraper for enriching RepairAi-files with repair documentation')
  .version('1.0.0');

// Check required environment variables
function checkEnvVars() {
  const required = ['OPENROUTER_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('   Copy .env.example to .env and add your API keys');
    console.warn('');
  }
}

// Scrape command
program
  .command('scrape')
  .description('Scrape repair data for a specific device model')
  .requiredOption('-m, --model <model>', 'Device model to search for (e.g., "Samsung A310F")')
  .option('-o, --mode <mode>', 'Processing mode: "raw" (save raw data) or "ai" (AI processing)', 'raw')
  .option('-s, --source <source>', 'Specific source to scrape (default: all enabled sources)')
  .option('-o, --output <dir>', 'Output directory', './data/staging')
  .action(async (options) => {
    checkEnvVars();
    await scrapeCommand(options);
  });

// Analyze images command
program
  .command('analyze-images')
  .description('Analyze downloaded images with Gemini AI')
  .requiredOption('-f, --folder <folder>', 'Folder containing images to analyze')
  .option('-p, --prompt <prompt>', 'Analysis prompt', 'Describe this repair image in detail')
  .option('-m, --model <model>', 'Gemini model to use', 'gemini-pro-vision')
  .action(async (options) => {
    checkEnvVars();
    await analyzeImagesCommand(options);
  });

// Update sources command
program
  .command('update-sources')
  .description('Update sources from a txt file (from another AI)')
  .requiredOption('-f, --file <file>', 'Path to txt file containing new sources')
  .option('-d, --dry-run', 'Show what would be added without making changes', false)
  .action(async (options) => {
    checkEnvVars();
    await updateSourcesCommand(options);
  });

// Integrate command
program
  .command('integrate')
  .description('Review and integrate staged data into main repository')
  .requiredOption('-s, --source <source>', 'Path to staged data directory')
  .option('-m, --manufacturer <manufacturer>', 'Manufacturer name (e.g., "samsung")')
  .option('-md, --model <model>', 'Model name (e.g., "a310f")')
  .option('--approve', 'Auto-approve validated data', false)
  .option('--backup', 'Create backup before overwriting', true)
  .action(async (options) => {
    checkEnvVars();
    await integrateCommand(options);
  });

// Index command
program
  .command('index')
  .description('Generate or update index.json for RepairAi-files repository')
  .requiredOption('-r, --repo <repo>', 'Path to RepairAi-files repository')
  .option('--format <format>', 'Index format: "json" or "markdown"', 'json')
  .action(async (options) => {
    checkEnvVars();
    await indexCommand(options);
  });

// Extract models command
program
  .command('extract-models')
  .description('Extract and create directory structures for popular device models')
  .option('--manufacturers <manufacturers>', 'Comma-separated list of manufacturers (default: all)')
  .action(async (options) => {
    const extractOptions = {};
    if (options.manufacturers) {
      extractOptions.manufacturers = options.manufacturers.split(',').map(m => m.trim().toLowerCase());
    }
    await extractModels(extractOptions);
  });

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().verbose) {
      console.log('🔍 Verbose mode enabled');
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught error:', error.message);
  if (program.opts().verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

// Parse and execute
// If no arguments, start interactive mode
if (process.argv.length === 2) {
  interactiveMode();
} else {
  program.parse(process.argv);
}

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}
