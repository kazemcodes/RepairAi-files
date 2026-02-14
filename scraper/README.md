# RepairAi Scraper

AI-powered web scraper for enriching RepairAi-files with repair documentation.

## Overview

RepairAi Scraper is a Node.js CLI tool that uses AI (OpenRouter and Google Gemini) to scrape, analyze, and integrate repair documentation from curated web sources into the RepairAi-files repository.

## Features

- 🤖 **AI-Powered Scraping**: Uses advanced AI models to extract and format repair data
- 🔍 **Curated Sources**: Pre-configured list of trusted repair documentation websites
- 📊 **Multiple Processing Modes**: Raw data saving or AI-powered processing
- 🖼️ **Image Analysis**: Gemini Vision for analyzing repair images and schematics
- 📝 **PDF Analysis**: Extract information from PDF schematics
- ✅ **Strict Validation**: Multi-stage validation to prevent incorrect data
- 🔄 **Staging Workflow**: Review and validate data before integration
- 📑 **Auto-Indexing**: Automatically generate index.json for the repository

## Requirements

- Node.js >= 18.0.0
- npm or yarn
- API Keys:
  - OpenRouter API key (for AI processing)
  - Google Gemini API key (for image/PDF analysis)

## Installation

```bash
cd scraper
npm install
```

## Quick Start

### Interactive Mode (Recommended)

The easiest way to use the scraper is in interactive mode - just run:

```bash
cd scraper
npm install
node src/index.js
```

This will show a menu where you can:
1. Scrape repair data for a device
2. Analyze images with AI
3. Add new sources from file
4. Integrate staged data
5. Generate repository index
6. Configure API keys
7. View current configuration

### Command Line Mode

For advanced users, you can use command line arguments:

```bash
# Scrape data
node src/index.js scrape --model "Samsung A310F" --mode raw

# Analyze images
node src/index.js analyze-images --folder ./data/images

# Update sources
node src/index.js update-sources --file ./new-sources.txt

# Integrate data
node src/index.js integrate --source ./data/staging/samsung/a310f --manufacturer samsung --model a310f

# Generate index
node src/index.js index --repo ..
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your API keys to `.env`:
```
OPENROUTER_API_KEY=your_openrouter_key_here
GEMINI_API_KEY=your_gemini_key_here
```

Or use the interactive config option (option 6 in the menu).

3. (Optional) Edit `config.yaml` to customize settings

## Usage

### Scrape Repair Data

Scrape data for a specific device model:

```bash
# Raw mode - saves raw HTML and metadata
npm run scrape -- --model "Samsung A310F" --mode raw

# AI mode - processes and formats with AI
npm run scrape -- --model "Samsung A310F" --mode ai

# From specific source only
npm run scrape -- --model "Samsung A310F" --source ifixit
```

### Analyze Images

Analyze downloaded images with Gemini Vision:

```bash
npm run analyze -- --folder ./data/images --prompt "Describe the repair components"
```

### Update Sources

Add new sources from a text file (from another AI):

```bash
# Dry run - see what would be added
npm run update-sources -- --file ./new-sources.txt --dry-run

# Actually add the sources
npm run update-sources -- --file ./new-sources.txt
```

### Integrate Data

Review and integrate staged data:

```bash
# Interactive mode
npm run integrate -- --source ./data/staging/samsung/a310f --manufacturer samsung --model a310f

# Auto-approve validated data
npm run integrate -- --source ./data/staging/samsung/a310f --manufacturer samsung --model a310f --approve
```

### Generate Index

Update the repository index:

```bash
# JSON format (default)
npm run index -- --repo ../repairai-files

# Markdown format
npm run index -- --repo ../repairai-files --format markdown
```

## Project Structure

```
scraper/
├── config/
│   ├── config.yaml          # Main configuration
│   └── sources.txt         # Curated source list
├── src/
│   ├── index.js            # CLI entry point
│   ├── commands/           # CLI command handlers
│   │   ├── scrape.js
│   │   ├── analyze-images.js
│   │   ├── update-sources.js
│   │   ├── integrate.js
│   │   └── index.js
│   ├── scrapers/           # Web scrapers
│   │   └── base-scraper.js
│   ├── services/           # External services
│   │   └── ai-service.js
│   └── utils/              # Utilities
│       ├── config.js
│       └── sources.js
├── tests/                  # TDD tests
├── data/                   # Data storage
│   ├── staging/           # Staged data for review
│   ├── images/            # Downloaded images
│   └── raw/              # Raw scraped data
└── package.json
```

## Source Configuration

Edit `config/sources.txt` to manage data sources:

```
# Format: name|url|pattern|enabled|type|priority|description
ifixit|https://www.ifixit.com|Device/{manufacturer}/{model}|true|general|8|iFixit repair guides
```

## Validation System

The scraper uses a strict multi-stage validation system:

1. **Format Validation**: Ensures RepairAi-files format compliance
2. **Consistency Check**: Compares with existing data for conflicts
3. **Citation Check**: Verifies technical claims

Scoring:
- 75+: Auto-approved
- 50-75: Manual review required
- <50: Auto-rejected

## API Keys

### OpenRouter
Get your API key from: https://openrouter.ai/

### Google Gemini
Get your API key from: https://aistudio.google.com/app/apikey

## Troubleshooting

### "OpenRouter API key not configured"
Make sure `OPENROUTER_API_KEY` is set in your `.env` file.

### Puppeteer fails to launch
Ensure you have Chrome/Chromium installed, or install dependencies:
```bash
npx puppeteer browsers install chrome
```

### Rate limiting
The scraper includes delays between requests. Configure in `config.yaml`:
```yaml
scraper:
  request_delay: 2000  # ms
```

## Development

### Running Tests
```bash
npm test
```

### Adding New Commands
1. Create command file in `src/commands/`
2. Export async function handling options
3. Register in `src/index.js`

## License

MIT
