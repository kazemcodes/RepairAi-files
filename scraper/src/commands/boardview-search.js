/**
 * BoardView File Search & Download
 * Searches for and downloads boardview files for phones
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

/**
 * Search for boardview files
 * @param {Object} options - Command options
 */
async function boardviewSearch(options = {}) {
  const {
    manufacturer = null,
    model = null,
    outputDir = './data/boardview',
    format = 'all' // 'brd', 'bv', 'bdv', 'all'
  } = options;

  console.log('🔍 Searching for BoardView files...');
  if (manufacturer) console.log(`Manufacturer: ${manufacturer}`);
  if (model) console.log(`Model: ${model}`);
  console.log(`Format: ${format}`);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Known sources for boardview files
  const sources = [
    {
      name: 'alisaler.com',
      url: 'https://www.alisaler.com/category-laptop-boardview/',
      type: 'laptop',
      note: 'Primarily laptop boardviews'
    },
    {
      name: 'gadget-manual.com',
      url: 'https://www.gadget-manual.com/boardview/',
      type: 'phone',
      note: 'Phone and laptop boardviews'
    },
    {
      name: 'alifixit.com',
      url: 'https://www.alifixit.com/boardview-software/',
      type: 'general',
      note: 'Various device boardviews'
    },
    {
      name: 'GitHub',
      url: 'https://github.com/search?q=boardview+iphone',
      type: 'community',
      note: 'Community-uploaded files'
    }
  ];

  console.log('\n📚 Known BoardView Sources:');
  sources.forEach((source, index) => {
    console.log(`${index + 1}. ${source.name}`);
    console.log(`   URL: ${source.url}`);
    console.log(`   Type: ${source.type}`);
    console.log(`   Note: ${source.note}`);
    console.log('');
  });

  // Search terms
  const searchTerms = buildSearchTerms(manufacturer, model);
  
  console.log('🔎 Recommended Search Terms:');
  searchTerms.forEach((term, index) => {
    console.log(`${index + 1}. "${term}"`);
  });

  // Save search guide
  const guideFile = path.join(outputDir, 'search-guide.md');
  await fs.writeFile(guideFile, generateSearchGuide(manufacturer, model, sources, searchTerms), 'utf8');
  console.log(`\n📝 Search guide saved to: ${guideFile}`);

  // Create directory structure
  if (manufacturer && model) {
    const deviceDir = path.join(outputDir, sanitizeFilename(manufacturer), sanitizeFilename(model));
    await fs.mkdir(deviceDir, { recursive: true });
    console.log(`📁 Created directory: ${deviceDir}`);
    
    // Create README
    const readmeFile = path.join(deviceDir, 'README.md');
    await fs.writeFile(readmeFile, generateDeviceReadme(manufacturer, model), 'utf8');
    console.log(`📄 Created README: ${readmeFile}`);
  }

  console.log('\n💡 Next Steps:');
  console.log('1. Visit the sources listed above');
  console.log('2. Search using the recommended terms');
  console.log('3. Download .brd, .bv, or .bdv files');
  console.log('4. Place files in the created directory');
  console.log('5. Run conversion: npm run convert-boardview');

  return {
    sources,
    searchTerms,
    outputDir
  };
}

/**
 * Build search terms
 */
function buildSearchTerms(manufacturer, model) {
  const terms = [];
  
  if (manufacturer && model) {
    terms.push(`${manufacturer} ${model} boardview`);
    terms.push(`${manufacturer} ${model} .brd`);
    terms.push(`${manufacturer} ${model} schematic boardview`);
    terms.push(`${manufacturer} ${model} PCB layout`);
  } else if (manufacturer) {
    terms.push(`${manufacturer} boardview files`);
    terms.push(`${manufacturer} phone boardview`);
  } else {
    terms.push('iPhone boardview');
    terms.push('Samsung boardview');
    terms.push('phone boardview files');
    terms.push('mobile boardview download');
  }
  
  // Add format-specific terms
  terms.push('boardview .brd download');
  terms.push('boardview .bv files');
  terms.push('OpenBoardView files');
  
  return terms;
}

/**
 * Generate search guide
 */
function generateSearchGuide(manufacturer, model, sources, searchTerms) {
  const device = manufacturer && model ? `${manufacturer} ${model}` : 'your device';
  
  return `# BoardView File Search Guide

## Device: ${device}

This guide will help you find boardview files for ${device}.

## What are BoardView Files?

BoardView files (.brd, .bv, .bdv) are PCB layout files that show:
- Component locations (U1, C5, R10, etc.)
- Pin numbers and connections
- Net names (VCC, GND, etc.)
- Board outline and dimensions
- Test points

## Where to Search

${sources.map((source, index) => `
### ${index + 1}. ${source.name}

- **URL**: ${source.url}
- **Type**: ${source.type}
- **Note**: ${source.note}
`).join('\n')}

## Search Terms

Use these search terms to find files:

${searchTerms.map((term, index) => `${index + 1}. \`${term}\``).join('\n')}

## File Formats

| Format | Description | Viewer |
|--------|-------------|--------|
| .BRD | TopTest BoardView | OpenBoardView |
| .BV | ATE BoardView | OpenBoardView |
| .BDV | HONHAN BoardView | OpenBoardView |
| .ASC | ASUS TSICT | ASUS Viewer |
| .FZ | PCB Repair Tool | PCB Repair Tool |

## How to Download

1. Visit one of the sources above
2. Search for your device
3. Look for files with extensions: .brd, .bv, .bdv
4. Download the file
5. Place in this directory
6. Run conversion script

## Verification

After downloading, verify the file:

\`\`\`bash
# Install OpenBoardView
# Download from: https://github.com/OpenBoardView/OpenBoardView

# Open the file
openboardview your-file.brd

# Check:
# - Board outline is visible
# - Components are labeled
# - Search works (press /)
# - Correct device
\`\`\`

## Legal Notice

⚠️ **Important**: Only download files that are:
- Explicitly marked as free/open
- From open-source projects
- User-created and shared
- Licensed for redistribution

Do NOT download:
- Leaked manufacturer files
- Files from paid services
- Copyrighted materials without permission

## Attribution

When you find a file, please note:
- Source URL
- License (if specified)
- Original author/uploader
- Date downloaded

This information will be included in the repository.

## Need Help?

If you can't find files for your device:
1. Ask in repair forums (badcaps.net, eevblog.com)
2. Check GitHub repositories
3. Request in RepairAI community
4. Consider contributing if you have files

---

Generated: ${new Date().toISOString()}
`;
}

/**
 * Generate device README
 */
function generateDeviceReadme(manufacturer, model) {
  return `# ${manufacturer} ${model} - BoardView Files

## Directory Contents

Place downloaded boardview files here:

\`\`\`
${manufacturer}/${model}/
├── README.md                    # This file
├── original/                    # Original .brd/.bv files
│   ├── board-rev-a.brd
│   └── board-rev-b.brd
├── converted/                   # Converted JSON files
│   ├── boardview.json
│   ├── board-top.svg
│   └── board-bottom.svg
└── _sources.json               # Attribution info
\`\`\`

## File Naming Convention

Use descriptive names:
- \`${manufacturer}_${model}_RevA.brd\`
- \`${manufacturer}_${model}_820-12345.brd\` (with board number)
- \`${manufacturer}_${model}_v1.0.brd\` (with version)

## Attribution Template

Create \`_sources.json\` with this format:

\`\`\`json
{
  "files": [
    {
      "filename": "board-rev-a.brd",
      "source": "https://example.com/file.brd",
      "license": "Unknown / Fair Use",
      "downloadedAt": "2024-02-14T12:00:00Z",
      "uploadedBy": "username",
      "boardRevision": "Rev A",
      "notes": "Main production board"
    }
  ]
}
\`\`\`

## Conversion

After placing files here, run:

\`\`\`bash
cd scraper
npm run convert-boardview -- --input ../data/boardview/${manufacturer}/${model}/original
\`\`\`

This will:
1. Parse .brd/.bv files with OpenBoardView
2. Extract component data to JSON
3. Generate SVG layer images
4. Create preview images
5. Save to \`converted/\` directory

## Verification Checklist

Before submitting:

- [ ] File opens in OpenBoardView
- [ ] Board outline is correct
- [ ] Components are labeled
- [ ] Search functionality works
- [ ] Correct device model
- [ ] Attribution information complete
- [ ] License verified
- [ ] No personal/sensitive data

## Contributing

To contribute these files to RepairAI:

1. Verify all checklist items above
2. Ensure proper attribution
3. Run conversion script
4. Test in web viewer
5. Submit pull request

---

Last updated: ${new Date().toISOString()}
`;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

module.exports = boardviewSearch;
