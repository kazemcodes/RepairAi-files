/**
 * TDD Tests for Source Manager
 * Tests parsing and managing repair data sources from sources.txt
 */

// Sample sources.txt format for testing
const sampleSourcesContent = `# RepairAi Data Sources
# Format: source_name|base_url|search_pattern|enabled

# iFixit - Comprehensive repair guides
ifixit|https://www.ifixit.com|Device/{manufacturer}/{model}|true

# Samsung Service Manuals
samsung-support|https://www.samsung.com|support/{model}-manual|true

# GSMArena - Device specifications
gsmarena|https://www.gsmarena.com|{manufacturer}-{model}-*.php|true

# XDA Developers - Technical forums
xda-developers|https://forum.xda-developers.com|{model}-repair|false

# iPhoneRepair - Apple specific
iphonerepair|https://www.iphonerepair.com|guides/{model}|true

# MobileZion - Schematics
mobilezion|https://mobilezion.com|schematics/{manufacturer}/{model}|true
`;

// Source manager class for testing
class SourceManager {
  constructor(sourcesContent) {
    this.sources = this.parseSources(sourcesContent);
  }

  parseSources(content) {
    const lines = content.split('\n');
    const sources = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const parts = trimmed.split('|');
      if (parts.length >= 4) {
        sources.push({
          name: parts[0],
          baseUrl: parts[1],
          searchPattern: parts[2],
          enabled: parts[3].toLowerCase() === 'true'
        });
      }
    }
    
    return sources;
  }

  getEnabledSources() {
    return this.sources.filter(s => s.enabled);
  }

  getSourceByName(name) {
    return this.sources.find(s => s.name === name);
  }

  getSearchUrl(source, manufacturer, model) {
    const pattern = source.searchPattern
      .replace('{manufacturer}', manufacturer.toLowerCase())
      .replace('{model}', model.toLowerCase().replace(/\s+/g, '-'));
    return `${source.baseUrl}/${pattern}`;
  }
}

describe('Source Manager', () => {
  let sourceManager;

  beforeEach(() => {
    sourceManager = new SourceManager(sampleSourcesContent);
  });

  test('should parse sources.txt content', () => {
    expect(sourceManager.sources.length).toBeGreaterThan(0);
  });

  test('should correctly parse source with all fields', () => {
    const ifixit = sourceManager.getSourceByName('ifixit');
    expect(ifixit).toBeDefined();
    expect(ifixit.baseUrl).toBe('https://www.ifixit.com');
    expect(ifixit.enabled).toBe(true);
  });

  test('should filter enabled sources', () => {
    const enabled = sourceManager.getEnabledSources();
    // xda-developers is disabled in sample
    expect(enabled.find(s => s.name === 'xda-developers')).toBeUndefined();
    expect(enabled.length).toBe(5);
  });

  test('should generate correct search URL', () => {
    const ifixit = sourceManager.getSourceByName('ifixit');
    const url = sourceManager.getSearchUrl(ifixit, 'Samsung', 'A310F');
    expect(url).toBe('https://www.ifixit.com/Device/samsung/a310f');
  });

  test('should handle manufacturer with spaces', () => {
    const samsung = sourceManager.getSourceByName('samsung-support');
    const url = sourceManager.getSearchUrl(samsung, 'Samsung', 'Galaxy A3');
    expect(url).toBe('https://www.samsung.com/support/galaxy-a3-manual');
  });

  test('should skip comments and empty lines', () => {
    const sources = sourceManager.sources;
    const hasComment = sources.some(s => s.name.startsWith('#'));
    expect(hasComment).toBe(false);
  });

  test('should handle disabled sources correctly', () => {
    const xda = sourceManager.getSourceByName('xda-developers');
    expect(xda.enabled).toBe(false);
    expect(xda.baseUrl).toBe('https://forum.xda-developers.com');
  });
});

describe('Source URL Patterns', () => {
  test('should handle GSMArena pattern with wildcard', () => {
    const content = `gsmarena|https://www.gsmarena.com|samsung-a310f-*.php|true`;
    const manager = new SourceManager(content);
    const source = manager.getSourceByName('gsmarena');
    expect(source.searchPattern).toContain('*');
  });
});
