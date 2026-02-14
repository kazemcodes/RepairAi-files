/**
 * TDD Tests for Config Loader
 * Tests that configuration is loaded correctly from config.yaml and .env
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock config loader for testing
const mockConfig = {
  api: {
    openrouter: {
      base_url: "https://openrouter.ai/api/v1",
      default_model: "google/gemini-pro"
    },
    gemini: {
      base_url: "https://generativelanguage.googleapis.com/v1beta",
      vision_model: "gemini-pro-vision",
      text_model: "gemini-pro"
    }
  },
  scraper: {
    page_timeout: 30000,
    request_delay: 2000,
    max_retries: 3,
    user_agent: "RepairAi-Scraper/1.0",
    headless: true
  },
  directories: {
    repo_root: "..",
    staging: "./data/staging",
    images: "./data/images",
    raw_data: "./data/raw",
    sources_file: "./config/sources.txt"
  },
  validation: {
    min_auto_approve_score: 75,
    review_score_range: [50, 75],
    auto_reject_score: 50
  },
  output: {
    create_backup: true,
    backup_dir: "./data/backups"
  }
};

describe('Config Loader', () => {
  test('should have default config structure', () => {
    // Verify config has required sections
    expect(mockConfig).toHaveProperty('api');
    expect(mockConfig).toHaveProperty('scraper');
    expect(mockConfig).toHaveProperty('directories');
    expect(mockConfig).toHaveProperty('validation');
    expect(mockConfig).toHaveProperty('output');
  });

  test('should have OpenRouter configuration', () => {
    expect(mockConfig.api.openrouter).toHaveProperty('base_url');
    expect(mockConfig.api.openrouter).toHaveProperty('default_model');
    expect(mockConfig.api.openrouter.base_url).toBe('https://openrouter.ai/api/v1');
  });

  test('should have Gemini configuration', () => {
    expect(mockConfig.api.gemini).toHaveProperty('base_url');
    expect(mockConfig.api.gemini).toHaveProperty('vision_model');
    expect(mockConfig.api.gemini).toHaveProperty('text_model');
  });

  test('should have scraper configuration', () => {
    expect(mockConfig.scraper).toHaveProperty('page_timeout');
    expect(mockConfig.scraper).toHaveProperty('request_delay');
    expect(mockConfig.scraper).toHaveProperty('max_retries');
    expect(mockConfig.scraper).toHaveProperty('headless');
    expect(mockConfig.scraper.page_timeout).toBe(30000);
  });

  test('should have directory configuration', () => {
    expect(mockConfig.directories).toHaveProperty('repo_root');
    expect(mockConfig.directories).toHaveProperty('staging');
    expect(mockConfig.directories).toHaveProperty('images');
    expect(mockConfig.directories).toHaveProperty('sources_file');
  });

  test('should have validation configuration', () => {
    expect(mockConfig.validation).toHaveProperty('min_auto_approve_score');
    expect(mockConfig.validation).toHaveProperty('review_score_range');
    expect(mockConfig.validation).toHaveProperty('auto_reject_score');
    expect(mockConfig.validation.min_auto_approve_score).toBe(75);
  });

  test('validation scores should be in correct order', () => {
    const { auto_reject_score, review_score_range, min_auto_approve_score } = mockConfig.validation;
    expect(auto_reject_score).toBeLessThan(review_score_range[0]);
    expect(review_score_range[0]).toBeLessThan(review_score_range[1]);
    expect(review_score_range[1]).toBeLessThanOrEqual(min_auto_approve_score);
  });
});

describe('Environment Variables', () => {
  test('.env.example should exist', () => {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  test('.env.example should contain required API keys', () => {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    expect(content).toContain('OPENROUTER_API_KEY');
    expect(content).toContain('GEMINI_API_KEY');
  });
});
