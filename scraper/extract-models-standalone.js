/**
 * Standalone script to extract and create directory structures for popular device models
 * No external dependencies required
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Popular device models to search for
 */
const POPULAR_MODELS = {
  apple: [
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max', 'iPhone 12 Mini',
    'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max', 'iPhone 13 Mini',
    'iPhone 14', 'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 14 Plus',
    'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 15 Plus',
    'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 8', 'iPhone 8 Plus', 'iPhone 7', 'iPhone 7 Plus',
    'MacBook Pro 13 2020', 'MacBook Pro 16 2019', 'MacBook Air 2020'
  ],
  samsung: [
    'Galaxy S23', 'Galaxy S23 Plus', 'Galaxy S23 Ultra',
    'Galaxy S22', 'Galaxy S22 Plus', 'Galaxy S22 Ultra',
    'Galaxy S21', 'Galaxy S21 Plus', 'Galaxy S21 Ultra',
    'Galaxy S20', 'Galaxy S20 Plus', 'Galaxy S20 Ultra',
    'Galaxy Note 20', 'Galaxy Note 20 Ultra',
    'Galaxy A54', 'Galaxy A53', 'Galaxy A52', 'Galaxy A51',
    'Galaxy A34', 'Galaxy A33', 'Galaxy A32', 'Galaxy A31',
    'Galaxy A14', 'Galaxy A13', 'Galaxy A12', 'Galaxy A10'
  ],
  xiaomi: [
    'Redmi Note 13', 'Redmi Note 12', 'Redmi Note 11',
    'Redmi Note 10', 'Redmi Note 9', 'Redmi Note 8',
    'Mi 11', 'Mi 11 Pro', 'Mi 11 Ultra',
    'Mi 10', 'Mi 10 Pro', 'Mi 10T',
    'Poco X5', 'Poco X4', 'Poco X3', 'Poco F5', 'Poco F4'
  ],
  huawei: [
    'P50 Pro', 'P40 Pro', 'P30 Pro', 'P20 Pro',
    'Mate 50 Pro', 'Mate 40 Pro', 'Mate 30 Pro',
    'Nova 11', 'Nova 10', 'Nova 9'
  ],
  oppo: [
    'Find X6 Pro', 'Find X5 Pro', 'Find X3 Pro',
    'Reno 10', 'Reno 9', 'Reno 8', 'Reno 7',
    'A98', 'A78', 'A58'
  ],
  vivo: [
    'X90 Pro', 'X80 Pro', 'X70 Pro',
    'V29', 'V27', 'V25', 'V23',
    'Y36', 'Y27', 'Y22'
  ],
  oneplus: [
    'OnePlus 11', 'OnePlus 10 Pro', 'OnePlus 9 Pro',
    'OnePlus 8T', 'OnePlus 8 Pro', 'OnePlus 7T Pro',
    'Nord 3', 'Nord 2T', 'Nord CE 3'
  ],
  google: [
    'Pixel 8 Pro', 'Pixel 8',
    'Pixel 7 Pro', 'Pixel 7',
    'Pixel 6 Pro', 'Pixel 6',
    'Pixel 5', 'Pixel 4a'
  ]
};

/**
 * Generate search URLs for a device model
 */
function generateSearchUrls(manufacturer, model) {
  const searchTerms = [
    `${manufacturer} ${model} boardview`,
    `${manufacturer} ${model} schematic`,
    `${manufacturer} ${model} brd`,
    `${model} boardview download`,
    `${model} schematic download`
  ];

  return searchTerms.map(term => ({
    google: `https://www.google.com/search?q=${encodeURIComponent(term)}`,
    github: `https://github.com/search?q=${encodeURIComponent(term)}&type=repositories`,
    term
  }));
}

/**
 * Create directory structure for a device
 */
async function createDeviceStructure(manufacturer, model) {
  const manufacturerSlug = manufacturer.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  
  const basePath = path.join(__dirname, '..', manufacturerSlug, modelSlug);
  const boardviewPath = path.join(basePath, 'boardview');
  
  await fs.mkdir(boardviewPath, { recursive: true });
  
  return {
    basePath,
    boardviewPath,
    manufacturerSlug,
    modelSlug
  };
}

/**
 * Create README for device
 */
async function createDeviceReadme(paths, manufacturer, model) {
  const readme = `# ${manufacturer} ${model} - Boardview Files

## Device Information

- **Manufacturer**: ${manufacturer}
- **Model**: ${model}
- **Type**: Smartphone/Tablet

## Available Files

### Boardview Files

Place boardview files here:
- \`boardview.json\` - Parsed boardview data
- \`original.brd\` - Original boardview file
- \`layers/\` - SVG layer files
- \`preview.png\` - Board preview image

## How to Add Files

### Option 1: Use Scraper Tool

\`\`\`bash
cd repairai-files/scraper
node src/index.js boardview-convert \\
  --input path/to/${model.toLowerCase().replace(/\s+/g, '-')}.brd \\
  --output ../${paths.manufacturerSlug}/${paths.modelSlug}/boardview
\`\`\`

### Option 2: Manual Upload

1. Find boardview file (.brd, .bdv, .asc, .fz)
2. Convert using OpenBoardView or scraper
3. Place files in this directory

### Option 3: Web Contribution

Visit the RepairAI contribution portal to upload files.

## Search Resources

### Google Searches
- [${manufacturer} ${model} boardview](https://www.google.com/search?q=${encodeURIComponent(manufacturer + ' ' + model + ' boardview')})
- [${manufacturer} ${model} schematic](https://www.google.com/search?q=${encodeURIComponent(manufacturer + ' ' + model + ' schematic')})

### GitHub Repositories
- [Search GitHub](https://github.com/search?q=${encodeURIComponent(manufacturer + ' ' + model + ' boardview')}&type=repositories)

### Known Sources
- [AliSaler](https://www.alisaler.com/category-laptop-boardview/)
- [Gadget Manual](https://www.gadget-manual.com/boardview/)
- [Laptop Schematic](https://laptopschematic.com/boardview/)

## File Status

- [ ] Boardview file (.brd, .bdv, .asc, .fz)
- [ ] Converted to JSON
- [ ] SVG layers generated
- [ ] Preview image created
- [ ] Tested in app

## Contributing

If you have boardview files for this device:

1. Verify file quality
2. Convert to JSON format
3. Test in RepairAI app
4. Submit pull request

## Notes

Add any device-specific notes here:
- Board revisions
- Known issues
- Component variations
- Repair tips

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}
**Status**: Awaiting boardview files
`;

  await fs.writeFile(path.join(paths.basePath, 'README.md'), readme);
}

/**
 * Create search guide for device
 */
async function createSearchGuide(paths, manufacturer, model) {
  const searchUrls = generateSearchUrls(manufacturer, model);
  
  const guide = `# Search Guide: ${manufacturer} ${model}

## Quick Search Links

### Google Searches
${searchUrls.map(s => `- [${s.term}](${s.google})`).join('\n')}

### GitHub
${searchUrls.map(s => `- [${s.term}](${s.github})`).join('\n')}

### Direct Sources

#### AliSaler
1. Visit: https://www.alisaler.com/category-laptop-boardview/
2. Search for: "${manufacturer} ${model}"
3. Download .brd or .bdv file

#### Gadget Manual
1. Visit: https://www.gadget-manual.com/boardview/
2. Search for: "${model}"
3. Download available files

#### Laptop Schematic
1. Visit: https://laptopschematic.com/boardview/
2. Browse by manufacturer: ${manufacturer}
3. Find model: ${model}

#### Vinafix Forum
1. Visit: https://vinafix.com/forums/boardview/
2. Search: "${manufacturer} ${model}"
3. Register to download

## Search Tips

### Effective Search Terms
- "${manufacturer} ${model} boardview"
- "${manufacturer} ${model} schematic"
- "${model} brd file"
- "${model} boardview download"
- "${manufacturer} ${model} repair schematic"

### File Extensions to Look For
- \`.brd\` - Standard boardview format
- \`.bdv\` - Encoded boardview format
- \`.bv\` - Boardview format
- \`.asc\` - ASCII boardview format
- \`.fz\` - Encrypted boardview format (requires key)

### Alternative Names
- Board number (e.g., "A2160" for iPhone 11)
- Model number (e.g., "SM-G991B" for Galaxy S21)
- Codename (if known)

## Verification

Before using a boardview file:

1. **Check File Size**: Should be > 10KB
2. **Verify Format**: Open in text editor, check for valid data
3. **Test Parse**: Use scraper to convert
4. **Visual Check**: Generate preview, verify components

## Conversion

Once you find a file:

\`\`\`bash
# Convert to JSON
cd repairai-files/scraper
node src/index.js boardview-convert \\
  --input path/to/file.brd \\
  --output ../${paths.manufacturerSlug}/${paths.modelSlug}/boardview \\
  --generateSVG
\`\`\`

## Community Resources

### Forums
- [Vinafix](https://vinafix.com/forums/)
- [GSM Forum](https://forum.gsmhosting.com/)
- [Badcaps](https://www.badcaps.net/forum/)

### Telegram Groups
- Mobile Repair Schematics
- Boardview Files Sharing
- Phone Repair Community

### Discord Servers
- Electronics Repair
- Mobile Technicians
- Right to Repair

## Legal Notice

Only use boardview files that are:
- Publicly available
- Legally obtained
- Not under NDA
- Properly attributed

## Status

- [ ] Searched Google
- [ ] Searched GitHub
- [ ] Checked AliSaler
- [ ] Checked Gadget Manual
- [ ] Checked forums
- [ ] File found
- [ ] File downloaded
- [ ] File converted
- [ ] File tested

---

**Created**: ${new Date().toISOString().split('T')[0]}
`;

  await fs.writeFile(
    path.join(paths.boardviewPath, 'SEARCH_GUIDE.md'),
    guide
  );
}

/**
 * Create placeholder boardview.json
 */
async function createPlaceholderJson(paths, manufacturer, model) {
  const placeholder = {
    format: "PLACEHOLDER",
    version: "1.0",
    status: "awaiting_boardview_file",
    device: {
      manufacturer,
      model,
      boardNumber: "Unknown",
      revision: "Unknown"
    },
    board: {
      width: 0,
      height: 0,
      outline: [],
      units: "mm",
      layers: 2
    },
    components: [],
    nets: [],
    pins: [],
    notes: [
      "This is a placeholder file.",
      "Actual boardview data is not yet available.",
      "Please contribute if you have boardview files for this device.",
      "See README.md for instructions on how to add files."
    ],
    search_resources: generateSearchUrls(manufacturer, model).map(s => s.google)
  };

  await fs.writeFile(
    path.join(paths.boardviewPath, 'boardview.json'),
    JSON.stringify(placeholder, null, 2)
  );
}

/**
 * Extract models and create structure
 */
async function extractModels(options = {}) {
  const { manufacturers = Object.keys(POPULAR_MODELS) } = options;
  
  console.log('🔍 Extracting popular device models...\n');
  
  const results = {
    created: [],
    skipped: [],
    errors: []
  };

  for (const manufacturer of manufacturers) {
    const models = POPULAR_MODELS[manufacturer] || [];
    
    console.log(`\n📱 ${manufacturer.toUpperCase()}`);
    console.log(`   Models: ${models.length}`);
    
    for (const model of models) {
      try {
        const paths = await createDeviceStructure(manufacturer, model);
        
        // Check if already exists with data
        const jsonPath = path.join(paths.boardviewPath, 'boardview.json');
        if (fsSync.existsSync(jsonPath)) {
          const existing = JSON.parse(fsSync.readFileSync(jsonPath, 'utf8'));
          if (existing.format !== 'PLACEHOLDER' && existing.components.length > 0) {
            console.log(`   ⏭️  ${model} - Already has data`);
            results.skipped.push({ manufacturer, model, reason: 'has_data' });
            continue;
          }
        }
        
        // Create structure
        await createDeviceReadme(paths, manufacturer, model);
        await createSearchGuide(paths, manufacturer, model);
        await createPlaceholderJson(paths, manufacturer, model);
        
        console.log(`   ✅ ${model} - Structure created`);
        results.created.push({ manufacturer, model, paths });
        
      } catch (error) {
        console.log(`   ❌ ${model} - Error: ${error.message}`);
        results.errors.push({ manufacturer, model, error: error.message });
      }
    }
  }

  // Generate summary
  console.log('\n\n📊 Summary');
  console.log(`   ✅ Created: ${results.created.length}`);
  console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
  console.log(`   ❌ Errors: ${results.errors.length}`);

  // Create index
  await createIndex(results);

  return results;
}

/**
 * Create master index of all devices
 */
async function createIndex(results) {
  const index = {
    generated: new Date().toISOString(),
    total_devices: results.created.length + results.skipped.length,
    devices_with_data: results.skipped.filter(s => s.reason === 'has_data').length,
    devices_awaiting_data: results.created.length,
    manufacturers: {},
    devices: []
  };

  // Group by manufacturer
  for (const item of [...results.created, ...results.skipped]) {
    if (!index.manufacturers[item.manufacturer]) {
      index.manufacturers[item.manufacturer] = {
        total: 0,
        with_data: 0,
        awaiting_data: 0
      };
    }
    
    index.manufacturers[item.manufacturer].total++;
    
    if (item.reason === 'has_data') {
      index.manufacturers[item.manufacturer].with_data++;
    } else {
      index.manufacturers[item.manufacturer].awaiting_data++;
    }
    
    index.devices.push({
      manufacturer: item.manufacturer,
      model: item.model,
      status: item.reason === 'has_data' ? 'available' : 'awaiting',
      path: item.paths ? `${item.paths.manufacturerSlug}/${item.paths.modelSlug}` : null
    });
  }

  const indexPath = path.join(__dirname, '..', 'DEVICES_INDEX.json');
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  
  console.log(`\n📄 Index created: DEVICES_INDEX.json`);
}

// Run the extraction
extractModels()
  .then(() => {
    console.log('\n✅ Extraction complete!');
  })
  .catch((error) => {
    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  });
