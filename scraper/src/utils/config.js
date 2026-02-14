/**
 * Configuration Loader
 * Loads and merges config.yaml with environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Config {
  constructor() {
    this.config = null;
    this.configPath = null;
  }

  /**
   * Load configuration from YAML file and merge with environment variables
   * @param {string} configPath - Path to config.yaml (optional)
   * @returns {object} Configuration object
   */
  load(configPath = null) {
    if (this.config) {
      return this.config;
    }

    // Determine config path
    if (!configPath) {
      configPath = path.join(__dirname, '..', 'config.yaml');
    }
    this.configPath = configPath;

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // Load YAML config
    const fileContents = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(fileContents);

    // Merge with environment variables (env vars take precedence)
    this.config = this.mergeEnvVars(this.config);

    // Set defaults for missing values
    this.config = this.setDefaults(this.config);

    return this.config;
  }

  /**
   * Merge environment variables into config
   * @param {object} config - Base configuration
   * @returns {object} Merged configuration
   */
  mergeEnvVars(config) {
    // OpenRouter API Key
    if (process.env.OPENROUTER_API_KEY) {
      config.api = config.api || {};
      config.api.openrouter = config.api.openrouter || {};
      config.api.openrouter.api_key = process.env.OPENROUTER_API_KEY;
    }

    // Gemini API Key
    if (process.env.GEMINI_API_KEY) {
      config.api = config.api || {};
      config.api.gemini = config.api.gemini || {};
      config.api.gemini.api_key = process.env.GEMINI_API_KEY;
    }

    // Override default model
    if (process.env.DEFAULT_MODEL) {
      config.api = config.api || {};
      config.api.openrouter = config.api.openrouter || {};
      config.api.openrouter.default_model = process.env.DEFAULT_MODEL;
    }

    // Override Gemini vision model
    if (process.env.GEMINI_VISION_MODEL) {
      config.api = config.api || {};
      config.api.gemini = config.api.gemini || {};
      config.api.gemini.vision_model = process.env.GEMINI_VISION_MODEL;
    }

    // Puppeteer settings
    if (process.env.HEADLESS !== undefined) {
      config.scraper = config.scraper || {};
      config.scraper.headless = process.env.HEADLESS === 'true';
    }

    if (process.env.REQUEST_DELAY) {
      config.scraper = config.scraper || {};
      config.scraper.request_delay = parseInt(process.env.REQUEST_DELAY, 10);
    }

    if (process.env.PAGE_TIMEOUT) {
      config.scraper = config.scraper || {};
      config.scraper.page_timeout = parseInt(process.env.PAGE_TIMEOUT, 10);
    }

    return config;
  }

  /**
   * Set default values for missing configuration
   * @param {object} config - Configuration object
   * @returns {object} Configuration with defaults
   */
  setDefaults(config) {
    // API defaults
    config.api = config.api || {};
    config.api.openrouter = config.api.openrouter || {};
    config.api.openrouter.base_url = config.api.openrouter.base_url || 'https://openrouter.ai/api/v1';
    config.api.openrouter.default_model = config.api.openrouter.default_model || 'google/gemini-pro';

    config.api.gemini = config.api.gemini || {};
    config.api.gemini.base_url = config.api.gemini.base_url || 'https://generativelanguage.googleapis.com/v1beta';
    config.api.gemini.vision_model = config.api.gemini.vision_model || 'gemini-pro-vision';
    config.api.gemini.text_model = config.api.gemini.text_model || 'gemini-pro';

    // Scraper defaults
    config.scraper = config.scraper || {};
    config.scraper.page_timeout = config.scraper.page_timeout || 30000;
    config.scraper.request_delay = config.scraper.request_delay || 2000;
    config.scraper.max_retries = config.scraper.max_retries || 3;
    config.scraper.user_agent = config.scraper.user_agent || 'RepairAi-Scraper/1.0';
    config.scraper.headless = config.scraper.headless !== undefined ? config.scraper.headless : true;

    // Directory defaults
    config.directories = config.directories || {};
    config.directories.repo_root = config.directories.repo_root || '..';
    config.directories.staging = config.directories.staging || './data/staging';
    config.directories.images = config.directories.images || './data/images';
    config.directories.raw_data = config.directories.raw_data || './data/raw';
    config.directories.sources_file = config.directories.sources_file || './config/sources.txt';

    // Validation defaults
    config.validation = config.validation || {};
    config.validation.min_auto_approve_score = config.validation.min_auto_approve_score || 75;
    config.validation.review_score_range = config.validation.review_score_range || [50, 75];
    config.validation.auto_reject_score = config.validation.auto_reject_score || 50;

    // Output defaults
    config.output = config.output || {};
    config.output.create_backup = config.output.create_backup !== undefined ? config.output.create_backup : true;
    config.output.backup_dir = config.output.backup_dir || './data/backups';

    return config;
  }

  /**
   * Get a specific config value
   * @param {string} key - Dot-notation key (e.g., 'api.openrouter.default_model')
   * @param {any} defaultValue - Default value if key not found
   * @returns {any} Config value
   */
  get(key, defaultValue = null) {
    if (!this.config) {
      this.load();
    }

    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Reload configuration from file
   * @returns {object} Reloaded configuration
   */
  reload() {
    this.config = null;
    return this.load(this.configPath);
  }
}

// Export singleton instance
export const config = new Config();
export default config;
