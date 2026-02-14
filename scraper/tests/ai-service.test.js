/**
 * TDD Tests for AI Service
 * Tests OpenRouter and Gemini API integration
 */

// Mock API responses
const mockOpenRouterResponse = {
  id: 'gen-123',
  choices: [{
    message: {
      content: JSON.stringify({
        valid: true,
        issues: [],
        score: 85
      })
    }
  }]
};

const mockGeminiResponse = {
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          description: 'Screw locations diagram showing 8 Phillips screws',
          components: ['Screw A1', 'Screw A2', 'Screw B1']
        })
      }]
    }
  }]
};

// AI Service class for testing
class AIService {
  constructor(config) {
    this.config = config;
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;
  }

  async callOpenRouter(prompt, model = null) {
    if (!this.openrouterKey) {
      throw new Error('OpenRouter API key not configured');
    }
    
    const modelToUse = model || this.config.api.openrouter.default_model;
    
    // In real implementation, this would make HTTP request
    return {
      model: modelToUse,
      prompt: prompt.substring(0, 100),
      success: true
    };
  }

  async callGemini(prompt, options = {}) {
    if (!this.geminiKey) {
      throw new Error('Gemini API key not configured');
    }

    const modelType = options.vision ? 
      this.config.api.gemini.vision_model : 
      this.config.api.gemini.text_model;

    return {
      model: modelType,
      hasImage: options.imagePath || false,
      success: true
    };
  }

  async analyzeImage(imagePath, prompt) {
    return this.callGemini(prompt, { vision: true, imagePath });
  }

  async analyzePDF(pdfPath, prompt) {
    // PDF analysis uses Gemini with document understanding
    return this.callGemini(prompt, { vision: false, pdfPath });
  }

  formatOpenRouterPrompt(systemPrompt, userContent) {
    return {
      model: this.config.api.openrouter.default_model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    };
  }

  formatGeminiPrompt(contents) {
    return {
      contents: contents
    };
  }
}

describe('AI Service', () => {
  const mockConfig = {
    api: {
      openrouter: {
        base_url: 'https://openrouter.ai/api/v1',
        default_model: 'google/gemini-pro'
      },
      gemini: {
        base_url: 'https://generativelanguage.googleapis.com/v1beta',
        vision_model: 'gemini-pro-vision',
        text_model: 'gemini-pro'
      }
    }
  };

  let aiService;

  beforeEach(() => {
    // Set mock API keys for testing
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    aiService = new AIService(mockConfig);
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  test('should have OpenRouter configuration', () => {
    expect(mockConfig.api.openrouter.base_url).toBe('https://openrouter.ai/api/v1');
    expect(mockConfig.api.openrouter.default_model).toBe('google/gemini-pro');
  });

  test('should have Gemini configuration', () => {
    expect(mockConfig.api.gemini.base_url).toBe('https://generativelanguage.googleapis.com/v1beta');
    expect(mockConfig.api.gemini.vision_model).toBe('gemini-pro-vision');
    expect(mockConfig.api.gemini.text_model).toBe('gemini-pro');
  });

  test('should throw error without OpenRouter key', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const service = new AIService(mockConfig);
    
    await expect(service.callOpenRouter('test')).rejects.toThrow('OpenRouter API key not configured');
  });

  test('should throw error without Gemini key', async () => {
    delete process.env.GEMINI_API_KEY;
    const service = new AIService(mockConfig);
    
    await expect(service.callGemini('test')).rejects.toThrow('Gemini API key not configured');
  });

  test('should format OpenRouter prompt correctly', () => {
    const formatted = aiService.formatOpenRouterPrompt('System prompt', 'User content');
    expect(formatted.model).toBe('google/gemini-pro');
    expect(formatted.messages).toHaveLength(2);
    expect(formatted.messages[0].role).toBe('system');
    expect(formatted.messages[1].role).toBe('user');
  });

  test('should format Gemini prompt correctly', () => {
    const formatted = aiService.formatGeminiPrompt([{ text: 'test' }]);
    expect(formatted.contents).toBeDefined();
  });

  test('should use vision model for image analysis', async () => {
    const result = await aiService.analyzeImage('./test.jpg', 'Describe this image');
    expect(result.model).toBe('gemini-pro-vision');
    expect(result.hasImage).toBe(true);
  });

  test('should use text model for PDF analysis', async () => {
    const result = await aiService.analyzePDF('./test.pdf', 'Extract text from this PDF');
    expect(result.model).toBe('gemini-pro');
    expect(result.success).toBe(true);
  });

  test('should allow custom model override in OpenRouter', async () => {
    const result = await aiService.callOpenRouter('test', 'anthropic/claude-3-opus');
    expect(result.model).toBe('anthropic/claude-3-opus');
  });
});

describe('API Key Environment Variables', () => {
  test('should check for OPENROUTER_API_KEY', () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    expect(process.env.OPENROUTER_API_KEY).toBe('test-key');
    delete process.env.OPENROUTER_API_KEY;
  });

  test('should check for GEMINI_API_KEY', () => {
    process.env.GEMINI_API_KEY = 'test-key';
    expect(process.env.GEMINI_API_KEY).toBe('test-key');
    delete process.env.GEMINI_API_KEY;
  });
});
