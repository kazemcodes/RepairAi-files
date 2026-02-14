/**
 * Base Scraper Class
 * Puppeteer-based scraper for web pages
 */

import puppeteer from 'puppeteer';
import axios from 'axios';
import cheerio from 'cheerio';
import config from '../utils/config.js';

export class BaseScraper {
  /**
   * @param {object} source - Source configuration
   */
  constructor(source) {
    this.source = source;
    this.config = config.load();
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize Puppeteer browser
   * @returns {Promise<Browser>} Puppeteer browser instance
   */
  async initBrowser() {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: this.config.scraper.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    return this.browser;
  }

  /**
   * Create a new page
   * @returns {Promise<Page>} Puppeteer page
   */
  async createPage() {
    if (!this.browser) {
      await this.initBrowser();
    }

    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent(this.config.scraper.user_agent);
    
    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    return this.page;
  }

  /**
   * Navigate to URL with retry logic
   * @param {string} url - URL to navigate
   * @param {object} options - Navigation options
   * @returns {Promise<object>} Navigation result
   */
  async navigateWithRetry(url, options = {}) {
    const maxRetries = this.config.scraper.max_retries;
    const timeout = this.config.scraper.page_timeout;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout 
        });
        
        return { success: true, url, attempts: attempt };
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          await this.sleep(this.config.scraper.request_delay);
        }
      }
    }
    
    return { 
      success: false, 
      url, 
      error: lastError.message,
      attempts: maxRetries 
    };
  }

  /**
   * Fetch page content using axios (for simpler pages)
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async fetchWithAxios(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': this.config.scraper.user_agent
      },
      timeout: this.config.scraper.page_timeout
    });
    
    return response.data;
  }

  /**
   * Parse HTML with Cheerio
   * @param {string} html - HTML content
   * @returns {Cheerio} Cheerio instance
   */
  parseHtml(html) {
    return cheerio.load(html);
  }

  /**
   * Take screenshot of current page
   * @param {string} path - Output path
   * @returns {Promise<string>} Screenshot path
   */
  async screenshot(path) {
    if (!this.page) {
      throw new Error('No page available. Call createPage() first.');
    }
    
    await this.page.screenshot({ path });
    return path;
  }

  /**
   * Get page HTML
   * @returns {Promise<string>} Page HTML
   */
  async getHtml() {
    if (!this.page) {
      throw new Error('No page available. Call createPage() first.');
    }
    
    return await this.page.content();
  }

  /**
   * Extract links from page
   * @param {string} selector - CSS selector
   * @returns {Promise<Array>} Array of links
   */
  async extractLinks(selector = 'a') {
    return await this.page.$$eval(selector, links => 
      links.map(link => ({
        href: link.href,
        text: link.textContent?.trim()
      }))
    );
  }

  /**
   * Extract images from page
   * @param {string} selector - CSS selector
   * @returns {Promise<Array>} Array of images
   */
  async extractImages(selector = 'img') {
    return await this.page.$$eval(selector, images => 
      images.map(img => ({
        src: img.src,
        alt: img.alt,
        title: img.title
      }))
    );
  }

  /**
   * Wait for element
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<ElementHandle>} Element handle
   */
  async waitForElement(selector, timeout = 30000) {
    if (!this.page) {
      throw new Error('No page available. Call createPage() first.');
    }
    
    return await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Click element
   * @param {string} selector - CSS selector
   * @returns {Promise<void>}
   */
  async click(selector) {
    await this.page.click(selector);
  }

  /**
   * Type into input
   * @param {string} selector - CSS selector
   * @param {string} text - Text to type
   * @param {object} options - Type options
   */
  async type(selector, text, options = { delay: 100 }) {
    await this.page.type(selector, text, options);
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Download image to file
   * @param {string} url - Image URL
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} Output path
   */
  async downloadImage(url, outputPath) {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      const writer = require('fs').createWriteStream(outputPath);
      response.data.pipe(writer);
      writer.on('finish', () => resolve(outputPath));
      writer.on('error', reject);
    });
  }
}

export default BaseScraper;
