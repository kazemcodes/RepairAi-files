/**
 * Source Manager
 * Manages the list of repair data sources from sources.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SourceManager {
  /**
   * @param {string} sourcesFile - Path to sources.txt file
   */
  constructor(sourcesFile = null) {
    this.sourcesFile = sourcesFile || path.join(__dirname, '..', '..', 'config', 'sources.txt');
    this.sources = [];
  }

  /**
   * Load and parse sources from file
   * @returns {SourceManager} this for chaining
   */
  load() {
    if (!fs.existsSync(this.sourcesFile)) {
      throw new Error(`Sources file not found: ${this.sourcesFile}`);
    }

    const content = fs.readFileSync(this.sourcesFile, 'utf-8');
    this.sources = this.parseSources(content);
    return this;
  }

  /**
   * Parse sources.txt content
   * Format: source_name|base_url|search_pattern|enabled
   * @param {string} content - File content
   * @returns {Array} Parsed sources
   */
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
          name: parts[0].trim(),
          baseUrl: parts[1].trim(),
          searchPattern: parts[2].trim(),
          enabled: parts[3].toLowerCase().trim() === 'true',
          // Optional fields
          type: parts[4]?.trim() || 'general',
          priority: parseInt(parts[5]?.trim() || '5', 10),
          description: parts[6]?.trim() || ''
        });
      }
    }

    return sources;
  }

  /**
   * Get all sources
   * @returns {Array} All sources
   */
  getAll() {
    if (this.sources.length === 0) {
      this.load();
    }
    return this.sources;
  }

  /**
   * Get enabled sources only
   * @returns {Array} Enabled sources
   */
  getEnabled() {
    return this.getAll().filter(s => s.enabled);
  }

  /**
   * Get source by name
   * @param {string} name - Source name
   * @returns {object|null} Source object or null
   */
  getByName(name) {
    return this.getAll().find(s => s.name === name) || null;
  }

  /**
   * Generate search URL for a source and model
   * @param {object} source - Source object
   * @param {string} manufacturer - Manufacturer name
   * @param {string} model - Model name
   * @returns {string} Generated URL
   */
  getSearchUrl(source, manufacturer, model) {
    const normalizedManufacturer = manufacturer.toLowerCase().replace(/\s+/g, '-');
    const normalizedModel = model.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    let pattern = source.searchPattern
      .replace('{manufacturer}', normalizedManufacturer)
      .replace('{model}', normalizedModel)
      .replace('{Manufacturer}', manufacturer)
      .replace('{Model}', model);

    // Handle wildcard patterns
    if (pattern.includes('*')) {
      pattern = pattern.replace(/\*/g, '');
    }

    // Ensure proper URL joining
    const baseUrl = source.baseUrl.replace(/\/$/, '');
    const urlPart = pattern.replace(/^\//, '');
    
    return `${baseUrl}/${urlPart}`;
  }

  /**
   * Search all enabled sources for a model
   * @param {string} manufacturer - Manufacturer
   * @param {string} model - Model name
   * @returns {Array} Array of {source, url} objects
   */
  search(manufacturer, model) {
    const enabled = this.getEnabled();
    return enabled.map(source => ({
      source,
      url: this.getSearchUrl(source, manufacturer, model)
    }));
  }

  /**
   * Add a new source
   * @param {object} source - Source object
   * @returns {SourceManager} this for chaining
   */
  add(source) {
    this.sources.push({
      name: source.name,
      baseUrl: source.baseUrl,
      searchPattern: source.searchPattern,
      enabled: source.enabled !== undefined ? source.enabled : true,
      type: source.type || 'general',
      priority: source.priority || 5,
      description: source.description || ''
    });
    return this;
  }

  /**
   * Remove a source by name
   * @param {string} name - Source name
   * @returns {SourceManager} this for chaining
   */
  remove(name) {
    this.sources = this.sources.filter(s => s.name !== name);
    return this;
  }

  /**
   * Toggle source enabled status
   * @param {string} name - Source name
   * @param {boolean} enabled - Enabled status
   * @returns {SourceManager} this for chaining
   */
  setEnabled(name, enabled) {
    const source = this.sources.find(s => s.name === name);
    if (source) {
      source.enabled = enabled;
    }
    return this;
  }

  /**
   * Save sources to file
   * @param {string} outputPath - Optional output path
   */
  save(outputPath = null) {
    const filePath = outputPath || this.sourcesFile;
    const lines = [
      '# RepairAi Data Sources',
      '# Format: source_name|base_url|search_pattern|enabled|type|priority|description',
      ''
    ];

    for (const source of this.sources) {
      const line = [
        source.name,
        source.baseUrl,
        source.searchPattern,
        source.enabled ? 'true' : 'false',
        source.type,
        source.priority,
        source.description
      ].join('|');
      
      lines.push(line);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  /**
   * Parse a new sources txt file (from another AI) and merge
   * @param {string} filePath - Path to new sources file
   * @returns {Array} New sources found
   */
  async parseAndMerge(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const newSources = this.parseSources(content);
    
    // Filter out sources that already exist
    const existingNames = new Set(this.sources.map(s => s.name));
    const toAdd = newSources.filter(s => !existingNames.has(s.name));

    // Add new sources (disabled by default for review)
    for (const source of toAdd) {
      source.enabled = false; // Disabled until reviewed
      this.add(source);
    }

    return toAdd;
  }
}

export default SourceManager;
