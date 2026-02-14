/**
 * AI Service
 * Handles OpenRouter and Gemini API integrations
 */

import axios from 'axios';
import config from '../utils/config.js';

export class AIService {
  constructor() {
    this.config = config.load();
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;
  }

  /**
   * Check if required API keys are configured
   * @throws {Error} If API keys are missing
   */
  checkKeys() {
    if (!this.openrouterKey) {
      throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env');
    }
  }

  /**
   * Call OpenRouter API
   * @param {string} prompt - User prompt
   * @param {string} model - Model to use (optional)
   * @returns {Promise<object>} API response
   */
  async callOpenRouter(prompt, model = null) {
    this.checkKeys();

    const modelToUse = model || this.config.api.openrouter.default_model;
    
    try {
      const response = await axios.post(
        `${this.config.api.openrouter.base_url}/chat/completions`,
        {
          model: modelToUse,
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3 // Lower temperature for more accurate/consistent results
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://repairai.app',
            'X-Title': 'RepairAi Scraper'
          },
          timeout: 60000
        }
      );

      return {
        success: true,
        model: modelToUse,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Call Gemini API
   * @param {string} prompt - User prompt
   * @param {object} options - Options (vision, imagePath, etc.)
   * @returns {Promise<object>} API response
   */
  async callGemini(prompt, options = {}) {
    if (!this.geminiKey) {
      throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in .env');
    }

    const modelType = options.vision ? 
      this.config.api.gemini.vision_model : 
      this.config.api.gemini.text_model;

    const modelSuffix = options.vision ? ':vision' : '';
    const url = `${this.config.api.gemini.base_url}/models/${modelType}${modelSuffix}:generateContent`;

    try {
      const contents = [];
      
      if (options.imagePath) {
        // For vision models, include image
        // In real implementation, would convert image to base64
        contents.push({
          parts: [
            { text: prompt }
            // Image would be added here
          ]
        });
      } else {
        contents.push({
          parts: [
            { text: prompt }
          ]
        });
      }

      const response = await axios.post(
        url,
        { contents },
        {
          params: {
            key: this.geminiKey
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      return {
        success: true,
        model: modelType,
        content: response.data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Analyze an image with Gemini Vision
   * @param {string} imagePath - Path to image file
   * @param {string} prompt - Analysis prompt
   * @returns {Promise<object>} Analysis result
   */
  async analyzeImage(imagePath, prompt) {
    // In a full implementation, would read and encode the image
    const analysisPrompt = prompt || 'Describe this repair-related image in detail. Include any visible components, labels, or markings.';
    return this.callGemini(analysisPrompt, { vision: true, imagePath });
  }

  /**
   * Analyze a PDF with Gemini
   * @param {string} pdfPath - Path to PDF file
   * @param {string} prompt - Analysis prompt
   * @returns {Promise<object>} Analysis result
   */
  async analyzePDF(pdfPath, prompt) {
    const analysisPrompt = prompt || 'Extract and summarize the key repair information from this document. Include any schematics, component locations, or repair procedures.';
    return this.callGemini(analysisPrompt, { vision: false, pdfPath });
  }

  /**
   * Get the system prompt for repair documentation
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    return `You are a repair documentation expert for mobile device repair.

IMPORTANT RULES:
1. Only provide information you are confident about
2. If unsure, mark as [UNVERIFIED]
3. Always cite sources when possible
4. Use proper RepairAi-files format

REPAIRAI-FILES FORMAT:
- screws.md: Table with [Location, Type, Size, Quantity, Notes]
- cover.md: Back cover removal instructions
- board.md: PCB layout and component identification  
- parts.md: Spare parts list with part numbers
- solution.md: Problems and solutions
- steps.md: Repair procedure overview
- steps/stepX.md: Detailed step-by-step guides

SAFETY WARNINGS: Use ⚠️ emoji
TIPS: Use 💡 emoji
NEVER use placeholder text like [TODO] or [INSERT]`;
  }

  /**
   * Format validation prompt for content
   * @param {string} content - Content to validate
   * @returns {string} Formatted prompt
   */
  formatValidationPrompt(content) {
    return `You are a repair documentation validator. 
Analyze the following content and verify it follows RepairAi-files format:

REQUIRED FILES per device:
- screws.md: Screw locations table with columns [Location, Type, Size, Quantity, Notes]
- cover.md: Back cover removal instructions
- board.md: PCB layout and component identification
- parts.md: Spare parts list with part numbers
- solution.md: Common problems and solutions
- steps.md: Repair procedure overview
- steps/stepX.md: Detailed step-by-step guides

CONTENT TO VALIDATE:
${content}

Verify:
1. All required sections exist
2. Tables are properly formatted in Markdown
3. Safety warnings use ⚠️ emoji
4. Tips use 💡 emoji
5. No placeholder text like [TODO] or [INSERT]

Respond with JSON:
{"valid": boolean, "issues": ["issue1", "issue2"], "score": 0-100}`;
  }

  /**
   * Format consistency check prompt
   * @param {string} existingData - Existing device documentation
   * @param {string} newData - New data to check
   * @returns {string} Formatted prompt
   */
  formatConsistencyPrompt(existingData, newData) {
    return `You are comparing new repair documentation against existing data.
EXISTING DATA from RepairAi-files:
${existingData}

NEW DATA to validate:
${newData}

Check for:
1. Contradictions in screw sizes or locations
2. Inconsistent part numbers
3. Conflicting solution steps
4. Different terminology for same components

Respond with JSON:
{"consistent": boolean, "conflicts": [], "similarities": [], "recommendation": "approve|review|reject"}`;
  }

  /**
   * Format citation prompt
   * @param {string} content - Content to check
   * @returns {string} Formatted prompt
   */
  formatCitationPrompt(content) {
    return `For each piece of technical data, cite the source URL.
If you cannot verify a fact, mark it as [UNVERIFIED].

CONTENT:
${content}

Technical claims requiring verification:
- Screw specifications
- Part numbers
- Voltage/current values
- Component locations

Respond with JSON:
{"verified": [{"fact": "...", "source": "..."}], "unverified": [...]}`;
  }

  /**
   * Process content through all validation stages
   * @param {object} content - Content to validate
   * @param {object} existingData - Existing data for comparison
   * @returns {Promise<object>} Validation results
   */
  async validateContent(content, existingData = null) {
    // Format validation
    const formatPrompt = this.formatValidationPrompt(content.raw);
    const formatResult = await this.callOpenRouter(formatPrompt);
    
    let formatScore = 0;
    try {
      const parsed = JSON.parse(formatResult.content);
      formatScore = parsed.score || 0;
    } catch (e) {
      console.warn('Failed to parse format validation response');
    }

    // Consistency validation (if existing data provided)
    let consistencyScore = 100;
    if (existingData) {
      const consistencyPrompt = this.formatConsistencyPrompt(existingData, content.raw);
      const consistencyResult = await this.callOpenRouter(consistencyPrompt);
      
      try {
        const parsed = JSON.parse(consistencyResult.content);
        consistencyScore = parsed.consistent ? 80 : 30;
      } catch (e) {
        console.warn('Failed to parse consistency validation response');
      }
    }

    // Citation validation
    const citationPrompt = this.formatCitationPrompt(content.raw);
    const citationResult = await this.callOpenRouter(citationPrompt);
    
    let citationScore = 50;
    try {
      const parsed = JSON.parse(citationResult.content);
      const verified = parsed.verified?.length || 0;
      const unverified = parsed.unverified?.length || 0;
      citationScore = verified > unverified ? 80 : 40;
    } catch (e) {
      console.warn('Failed to parse citation validation response');
    }

    // Calculate final score
    const finalScore = Math.round(formatScore * 0.3 + consistencyScore * 0.5 + citationScore * 0.2);

    return {
      score: finalScore,
      breakdown: {
        format: formatScore,
        consistency: consistencyScore,
        citation: citationScore
      },
      recommendation: finalScore >= 75 ? 'approve' : finalScore >= 50 ? 'review' : 'reject'
    };
  }
}

export default AIService;
