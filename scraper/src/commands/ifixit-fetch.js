/**
 * iFixit API Fetcher
 * Fetches repair guides and device information from iFixit's public API
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const IFIXIT_API_BASE = 'https://www.ifixit.com/api/2.0';

/**
 * Fetch device guides from iFixit
 * @param {Object} options - Command options
 */
async function ifixitFetch(options = {}) {
  const {
    manufacturer = null,
    model = null,
    outputDir = './data/ifixit',
    category = null
  } = options;

  console.log('🔧 Fetching data from iFixit API...');
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  try {
    // Step 1: Search for device category
    let deviceCategory = category;
    if (!deviceCategory && manufacturer && model) {
      console.log(`\n🔍 Searching for: ${manufacturer} ${model}`);
      deviceCategory = await searchDevice(manufacturer, model);
    }

    if (!deviceCategory) {
      console.log('❌ Could not find device category');
      console.log('💡 Try specifying a category manually');
      return;
    }

    console.log(`✅ Found category: ${deviceCategory}`);

    // Step 2: Fetch guides for the device
    console.log('\n📥 Fetching repair guides...');
    const guides = await fetchGuides(deviceCategory);
    console.log(`✅ Found ${guides.length} guides`);

    // Step 3: Fetch detailed information for each guide
    console.log('\n📖 Fetching guide details...');
    const detailedGuides = [];
    
    for (const guide of guides.slice(0, 10)) { // Limit to 10 guides
      try {
        const details = await fetchGuideDetails(guide.guideid);
        detailedGuides.push(details);
        console.log(`   ✓ ${guide.title}`);
        await delay(500); // Rate limiting
      } catch (error) {
        console.error(`   ✗ Failed to fetch ${guide.title}:`, error.message);
      }
    }

    // Step 4: Save results
    const outputFile = path.join(outputDir, `${sanitizeFilename(deviceCategory)}.json`);
    await fs.writeFile(
      outputFile,
      JSON.stringify({
        category: deviceCategory,
        manufacturer,
        model,
        fetchedAt: new Date().toISOString(),
        guides: detailedGuides
      }, null, 2),
      'utf8'
    );

    console.log(`\n✅ Data saved to: ${outputFile}`);
    console.log(`📊 Total guides: ${detailedGuides.length}`);

    // Step 5: Convert to RepairAI format
    console.log('\n🔄 Converting to RepairAI format...');
    await convertToRepairAIFormat(detailedGuides, manufacturer, model, outputDir);

    return detailedGuides;

  } catch (error) {
    console.error('❌ Error fetching from iFixit:', error.message);
    throw error;
  }
}

/**
 * Search for device category
 */
async function searchDevice(manufacturer, model) {
  const query = `${manufacturer} ${model}`;
  const url = `${IFIXIT_API_BASE}/suggest/${encodeURIComponent(query)}`;
  
  const data = await fetchJSON(url);
  
  if (data.results && data.results.length > 0) {
    // Find the first guide result
    const guideResult = data.results.find(r => r.dataType === 'guide');
    if (guideResult) {
      return guideResult.category;
    }
  }
  
  return null;
}

/**
 * Fetch guides for a category
 */
async function fetchGuides(category) {
  const url = `${IFIXIT_API_BASE}/guides?filter=category&filterid=${encodeURIComponent(category)}`;
  const data = await fetchJSON(url);
  return data || [];
}

/**
 * Fetch detailed guide information
 */
async function fetchGuideDetails(guideId) {
  const url = `${IFIXIT_API_BASE}/guides/${guideId}`;
  const data = await fetchJSON(url);
  return data;
}

/**
 * Convert iFixit data to RepairAI format
 */
async function convertToRepairAIFormat(guides, manufacturer, model, outputDir) {
  if (!manufacturer || !model) {
    console.log('⚠️  Manufacturer and model required for conversion');
    return;
  }

  const manufacturerDir = path.join(outputDir, '..', '..', manufacturer.toLowerCase());
  const modelDir = path.join(manufacturerDir, sanitizeFilename(model));
  
  await fs.mkdir(modelDir, { recursive: true });
  await fs.mkdir(path.join(modelDir, 'steps'), { recursive: true });

  // Create solution.md
  const solutions = guides.map((guide, index) => {
    return `## ${guide.title}

**Type:** ${guide.type}
**Difficulty:** ${guide.difficulty || 'Not specified'}
**Time Required:** ${guide.time_required || 'Not specified'}

**Summary:**
${guide.summary || 'No summary available'}

**Steps:** ${guide.steps ? guide.steps.length : 0}

**Source:** [iFixit Guide](${guide.url})

---
`;
  }).join('\n');

  await fs.writeFile(
    path.join(modelDir, 'solution.md'),
    `# Repair Solutions - ${manufacturer} ${model}

Source: iFixit API
Fetched: ${new Date().toISOString()}

${solutions}
`,
    'utf8'
  );

  // Create steps.md overview
  const stepsOverview = guides.map((guide, index) => {
    return `### ${index + 1}. ${guide.title}
- Difficulty: ${guide.difficulty || 'Not specified'}
- Steps: ${guide.steps ? guide.steps.length : 0}
- Time: ${guide.time_required || 'Not specified'}
`;
  }).join('\n');

  await fs.writeFile(
    path.join(modelDir, 'steps.md'),
    `# Repair Steps Overview - ${manufacturer} ${model}

${stepsOverview}

## Detailed Steps

See individual step files in the \`steps/\` directory.
`,
    'utf8'
  );

  // Create individual step files for the first guide
  if (guides.length > 0 && guides[0].steps) {
    const firstGuide = guides[0];
    for (let i = 0; i < firstGuide.steps.length; i++) {
      const step = firstGuide.steps[i];
      const stepContent = `# Step ${i + 1}: ${step.title || `Step ${i + 1}`}

${step.lines ? step.lines.map(line => `- ${line.text}`).join('\n') : ''}

${step.media && step.media.data ? `\n## Images\n\n${step.media.data.map(img => `![${img.text || 'Step image'}](${img.image.standard})`).join('\n\n')}` : ''}

---

**Source:** [iFixit](${firstGuide.url})
`;

      await fs.writeFile(
        path.join(modelDir, 'steps', `step${i + 1}.md`),
        stepContent,
        'utf8'
      );
    }
  }

  // Create _sources.json
  await fs.writeFile(
    path.join(modelDir, '_sources.json'),
    JSON.stringify({
      source: 'iFixit',
      api: 'https://www.ifixit.com/api/2.0',
      license: 'CC BY-NC-SA 3.0',
      fetchedAt: new Date().toISOString(),
      guides: guides.map(g => ({
        id: g.guideid,
        title: g.title,
        url: g.url
      }))
    }, null, 2),
    'utf8'
  );

  console.log(`✅ Converted to RepairAI format: ${modelDir}`);
}

/**
 * Fetch JSON from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = ifixitFetch;
