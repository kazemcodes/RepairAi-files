/**
 * Scrape Command
 * Scrapes repair data for a specific device model
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../utils/config.js';
import SourceManager from '../utils/sources.js';
import BaseScraper from '../scrapers/base-scraper.js';
import AIService from '../services/ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse device model string into manufacturer and model
 * @param {string} modelString - Full model string (e.g., "Samsung A310F")
 * @returns {object} {manufacturer, model}
 */
function parseModel(modelString) {
  // Common manufacturer prefixes
  const manufacturers = [
    'Samsung', 'Apple', 'Xiaomi', 'Redmi', 'Mi', 'Huawei', 'OnePlus',
    'Oppo', 'Vivo', 'Realme', 'Motorola', 'Nokia', 'LG', 'Sony', 'Google'
  ];
  
  let manufacturer = 'Unknown';
  let model = modelString;
  
  for (const m of manufacturers) {
    if (modelString.toLowerCase().startsWith(m.toLowerCase())) {
      manufacturer = m;
      model = modelString.substring(m.length).trim();
      break;
    }
  }
  
  return { manufacturer, model };
}

/**
 * Save raw scraped data to staging
 * @param {string} outputDir - Output directory
 * @param {string} manufacturer - Manufacturer name
 * @param {string} model - Model name
 * @param {object} data - Scraped data
 */
function saveRawData(outputDir, manufacturer, model, data) {
  const dir = path.join(outputDir, manufacturer.toLowerCase(), model.toLowerCase().replace(/\s+/g, '-'));
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Save raw HTML
  if (data.html) {
    fs.writeFileSync(path.join(dir, 'raw.html'), data.html, 'utf-8');
  }
  
  // Save metadata
  const metadata = {
    scraped: new Date().toISOString(),
    manufacturer,
    model,
    sources: data.sources,
    url: data.url
  };
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
  
  // Save images list
  if (data.images && data.images.length > 0) {
    fs.writeFileSync(path.join(dir, 'images.json'), JSON.stringify(data.images, null, 2), 'utf-8');
  }
  
  console.log(`✅ Raw data saved to: ${dir}`);
  
  return dir;
}

/**
 * Process data with AI
 * @param {object} data - Raw scraped data
 * @param {string} manufacturer - Manufacturer
 * @param {string} model - Model
 * @returns {Promise<object>} Processed data
 */
async function processWithAI(data, manufacturer, model) {
  const aiService = new AIService();
  
  console.log('🤖 Processing with AI...');
  
  // Analyze raw HTML content
  const analysisPrompt = `You are a mobile repair documentation expert. 
Analyze the following scraped web content about ${manufacturer} ${model} and extract repair-relevant information.

Extract:
1. Screw locations and specifications
2. Component identification
3. Repair procedures
4. Spare parts information
5. Troubleshooting solutions

Format the output as RepairAi-files markdown files ready to use.

SCRAPED CONTENT:
${data.html.substring(0, 10000)}`;

  const result = await aiService.callOpenRouter(analysisPrompt);
  
  if (!result.success) {
    throw new Error(`AI processing failed: ${result.error}`);
  }
  
  return {
    content: result.content,
    model: result.model,
    usage: result.usage
  };
}

/**
 * Main scrape command
 * @param {object} options - Command options
 */
export async function scrapeCommand(options) {
  const { model, mode, source: sourceName, output } = options;
  
  console.log('\n🔍 RepairAi Scraper');
  console.log('='.repeat(40));
  console.log(`Model: ${model}`);
  console.log(`Mode: ${mode}`);
  console.log(`Output: ${output}`);
  console.log('');
  
  // Load configuration
  const cfg = config.load();
  
  // Parse model string
  const { manufacturer, model: modelName } = parseModel(model);
  console.log(`Manufacturer: ${manufacturer}`);
  console.log(`Model: ${modelName}`);
  console.log('');
  
  // Load sources
  const sourceManager = new SourceManager(cfg.directories.sources_file);
  sourceManager.load();
  
  // Get sources to scrape
  let sourcesToUse;
  if (sourceName) {
    const specific = sourceManager.getByName(sourceName);
    if (!specific) {
      console.error(`❌ Source not found: ${sourceName}`);
      process.exit(1);
    }
    sourcesToUse = [specific];
  } else {
    sourcesToUse = sourceManager.getEnabled();
  }
  
  if (sourcesToUse.length === 0) {
    console.error('❌ No enabled sources found');
    process.exit(1);
  }
  
  console.log(`Found ${sourcesToUse.length} source(s) to scrape`);
  console.log('');
  
  // Scrape each source
  const results = [];
  
  for (const source of sourcesToUse) {
    console.log(`📡 Scraping from: ${source.name}`);
    
    try {
      // Generate search URL
      const searchUrl = sourceManager.getSearchUrl(source, manufacturer, modelName);
      console.log(`   URL: ${searchUrl}`);
      
      // Create scraper
      const scraper = new BaseScraper(source);
      
      try {
        // Initialize browser and navigate
        await scraper.createPage();
        const navResult = await scraper.navigateWithRetry(searchUrl);
        
        if (!navResult.success) {
          console.log(`   ❌ Navigation failed: ${navResult.error}`);
          results.push({ source: source.name, success: false, error: navResult.error });
          continue;
        }
        
        // Wait for content to load
        await scraper.sleep(2000);
        
        // Extract content
        const html = await scraper.getHtml();
        const links = await scraper.extractLinks();
        const images = await scraper.extractImages();
        
        // Take screenshot for reference
        const screenshotPath = path.join(cfg.directories.images, `${source.name}-${modelName}.png`);
        await scraper.screenshot(screenshotPath);
        
        const scrapedData = {
          html,
          links,
          images,
          url: searchUrl,
          sources: [source.name]
        };
        
        // Save based on mode
        if (mode === 'raw') {
          saveRawData(output, manufacturer, modelName, scrapedData);
        } else if (mode === 'ai') {
          const processed = await processWithAI(scrapedData, manufacturer, modelName);
          
          // Save processed data
          const outputDir = path.join(output, manufacturer.toLowerCase(), modelName.toLowerCase().replace(/\s+/g, '-'));
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          fs.writeFileSync(path.join(outputDir, 'ai-processed.md'), processed.content, 'utf-8');
          console.log(`   ✅ AI processed data saved to: ${outputDir}`);
        }
        
        results.push({ 
          source: source.name, 
          success: true,
          url: searchUrl
        });
        
        console.log(`   ✅ Scraped successfully`);
        
      } finally {
        await scraper.close();
      }
      
      // Respect rate limits
      await scraper.sleep(cfg.scraper.request_delay);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ source: source.name, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success).length;
  console.log(`   Successful: ${successful}/${results.length}`);
  
  if (successful > 0) {
    console.log('\n✅ Scraping completed!');
  } else {
    console.log('\n❌ No data scraped. Check sources and try again.');
    process.exit(1);
  }
}

export default scrapeCommand;
