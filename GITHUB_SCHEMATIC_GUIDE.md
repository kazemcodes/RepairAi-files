# GitHub Schematic Search & Integration Guide

This guide explains how to search for and integrate phone schematics from GitHub and other sources into the RepairAI-Files repository.

## Overview

The RepairAI-Files repository now includes tools to:
1. Search GitHub for schematic repositories
2. Fetch repair guides from iFixit API
3. Download and organize schematic files
4. Convert data to RepairAI format
5. Maintain proper attribution

## Quick Start

### Option 1: Use iFixit API (Recommended)

The easiest way to get high-quality repair data:

```bash
cd scraper
npm install
node src/index.js
# Select option for iFixit fetch
```

Or via command line:

```bash
node -e "const fetch = require('./src/commands/ifixit-fetch'); fetch({ manufacturer: 'Samsung', model: 'A310F' });"
```

### Option 2: Manual GitHub Search

1. Search for repositories:
   ```bash
   # Use web search to find repositories
   # Check github-schematic-sources.md for curated list
   ```

2. Download relevant files manually

3. Organize in manufacturer/model structure

## Available Tools

### 1. iFixit API Fetcher

**File:** `scraper/src/commands/ifixit-fetch.js`

**Features:**
- Searches iFixit's database
- Fetches detailed repair guides
- Downloads step-by-step instructions
- Converts to RepairAI format automatically
- Includes proper attribution

**Usage:**
```javascript
const ifixitFetch = require('./src/commands/ifixit-fetch');

await ifixitFetch({
  manufacturer: 'Samsung',
  model: 'Galaxy A3 2016',
  outputDir: './data/ifixit'
});
```

**Output Structure:**
```
data/ifixit/
├── samsung_galaxy_a3_2016.json  # Raw iFixit data
└── ../../samsung/a310f/          # RepairAI format
    ├── solution.md
    ├── steps.md
    ├── steps/
    │   ├── step1.md
    │   ├── step2.md
    │   └── ...
    └── _sources.json
```

### 2. GitHub Search Tool

**File:** `scraper/src/commands/github-search.js`

**Features:**
- Searches GitHub repositories
- Filters for schematic-related content
- Downloads relevant files
- Maintains metadata

**Usage:**
```javascript
const githubSearch = require('./src/commands/github-search');

await githubSearch({
  query: 'phone schematics',
  manufacturer: 'Samsung',
  model: 'A310F',
  outputDir: './data/github-schematics',
  limit: 10
});
```

**Note:** Requires GitHub API token for full functionality.

## Data Sources

### Primary Sources

1. **iFixit API** ✅ Recommended
   - URL: https://www.ifixit.com/api/2.0
   - License: CC BY-NC-SA 3.0
   - Quality: High
   - Coverage: Extensive
   - Cost: Free

2. **Gadget Manual**
   - URL: https://www.gadget-manual.com/
   - Content: Samsung schematics
   - Coverage: 260+ models
   - Note: Check terms of service

3. **Schematic Expert**
   - URL: https://www.schematic-expert.com/
   - Content: Multiple manufacturers
   - Note: Verify licensing

### GitHub Repositories

See `scraper/github-schematic-sources.md` for curated list.

## File Organization

### Standard Structure

```
repairai-files/
├── [manufacturer]/          # e.g., samsung, apple, xiaomi
│   ├── [model]/            # e.g., a310f, iphone12
│   │   ├── screws.md       # Screw locations
│   │   ├── cover.md        # Cover removal
│   │   ├── board.md        # PCB layout
│   │   ├── parts.md        # Parts list
│   │   ├── solution.md     # Common solutions
│   │   ├── steps.md        # Steps overview
│   │   ├── steps/          # Detailed steps
│   │   │   ├── step1.md
│   │   │   ├── step2.md
│   │   │   └── ...
│   │   ├── schematics/     # PDF/image schematics
│   │   │   ├── pcb-layout.pdf
│   │   │   ├── circuit-diagram.pdf
│   │   │   └── ...
│   │   └── _sources.json   # Attribution
│   └── ...
└── index.json              # Auto-generated index
```

### Attribution File (_sources.json)

Every device folder must include attribution:

```json
{
  "source": "iFixit",
  "api": "https://www.ifixit.com/api/2.0",
  "license": "CC BY-NC-SA 3.0",
  "fetchedAt": "2024-02-14T12:00:00Z",
  "guides": [
    {
      "id": 12345,
      "title": "Battery Replacement",
      "url": "https://www.ifixit.com/Guide/..."
    }
  ]
}
```

## Workflow

### Adding New Device Data

1. **Search for Data**
   ```bash
   # Option A: Use iFixit
   node src/commands/ifixit-fetch.js --manufacturer Samsung --model "A310F"
   
   # Option B: Manual search
   # Check github-schematic-sources.md
   ```

2. **Review Downloaded Data**
   ```bash
   # Check data/ifixit/ or data/github-schematics/
   ls -la data/ifixit/
   ```

3. **Verify Conversion**
   ```bash
   # Check manufacturer/model folder
   ls -la samsung/a310f/
   ```

4. **Update Index**
   ```bash
   npm run index -- --repo .. --format json
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add Samsung A310F schematics from iFixit"
   git push
   ```

### Quality Checklist

Before committing:

- [ ] All required files present (screws.md, cover.md, etc.)
- [ ] _sources.json includes proper attribution
- [ ] Markdown formatting is correct
- [ ] Images are optimized (< 500KB)
- [ ] No copyrighted material without permission
- [ ] License information is clear
- [ ] index.json is updated

## API Integration

### iFixit API

**Authentication:** Not required for public data

**Rate Limits:** Be respectful, add delays

**Example Requests:**

```bash
# Search for device
curl "https://www.ifixit.com/api/2.0/suggest/Samsung%20A310F"

# Get guides for category
curl "https://www.ifixit.com/api/2.0/guides?filter=category&filterid=Samsung%20Galaxy%20A3%202016"

# Get guide details
curl "https://www.ifixit.com/api/2.0/guides/12345"
```

### GitHub API

**Authentication:** Required for higher rate limits

**Setup:**
```bash
# Create personal access token at:
# https://github.com/settings/tokens

# Set environment variable
export GITHUB_TOKEN=your_token_here
```

**Example Requests:**

```bash
# Search repositories
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/search/repositories?q=phone+schematics"

# Get repository contents
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/owner/repo/contents"
```

## Legal & Licensing

### Acceptable Content

✅ **Allowed:**
- Content with permissive licenses (CC, MIT, Public Domain)
- iFixit guides (CC BY-NC-SA 3.0)
- User-contributed original content
- Public domain service manuals
- Fair use excerpts with attribution

❌ **Not Allowed:**
- Copyrighted service manuals without permission
- Proprietary manufacturer documents
- Content that violates terms of service
- Scraped content from sites that prohibit it

### Attribution Requirements

All content must include:

1. **Source URL**
2. **License type**
3. **Original author/publisher**
4. **Download/fetch date**
5. **Any required copyright notices**

### License Compatibility

RepairAI-Files uses MIT license for code, but content may have different licenses:

- **iFixit:** CC BY-NC-SA 3.0 (non-commercial, share-alike)
- **User contributions:** MIT or CC BY-SA 4.0
- **Public domain:** No restrictions

## Troubleshooting

### iFixit API Issues

**Problem:** "Device not found"
```bash
# Solution: Try different search terms
# Example: "Galaxy A3" instead of "A310F"
```

**Problem:** "Rate limit exceeded"
```bash
# Solution: Add delays between requests
# Already implemented in ifixit-fetch.js
```

### GitHub API Issues

**Problem:** "API rate limit exceeded"
```bash
# Solution: Authenticate with personal access token
export GITHUB_TOKEN=your_token
```

**Problem:** "Repository not found"
```bash
# Solution: Check if repository is public
# Verify URL is correct
```

### File Organization Issues

**Problem:** "Files in wrong location"
```bash
# Solution: Use sanitizeFilename function
# Check manufacturer/model naming conventions
```

## Contributing

### Adding New Sources

1. Research source legality and licensing
2. Add to `github-schematic-sources.md`
3. Create fetcher if API available
4. Document in this guide
5. Submit pull request

### Improving Tools

1. Fork repository
2. Create feature branch
3. Add tests
4. Update documentation
5. Submit pull request

## Future Enhancements

- [ ] Automated GitHub repository monitoring
- [ ] More API integrations (Xiaomi, Huawei, etc.)
- [ ] Image analysis with AI
- [ ] PDF schematic parsing
- [ ] Community contribution system
- [ ] Automated quality checks
- [ ] Multi-language support

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/repairai-files/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/repairai-files/discussions)
- **Email:** docs@repairai.app

## Resources

- [iFixit API Documentation](https://www.ifixit.com/api/2.0)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [RepairAI Documentation](../README.md)
- [Contribution Guidelines](../CONTRIBUTING.md)

---

**Last Updated:** February 14, 2026

