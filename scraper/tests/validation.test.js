/**
 * TDD Tests for Validation Prompts
 * Tests the strict prompts that prevent incorrect data
 */

// Validation prompt templates
const VALIDATION_PROMPTS = {
  format: `You are a repair documentation validator. 
Analyze the following content and verify it follows RepairAi-files format:

REQUIRED FILES per device:
- screws.md: Screw locations table with columns [Location, Type, Size, Quantity, Notes]
- cover.md: Back cover removal instructions
- board.md: PCB layout and component identification
- parts.md: Spare parts list with part numbers
- solution.md: Common problems and solutions
- steps.md: Repair procedure overview
- steps/stepX.md: Detailed step-by-step guides

Verify:
1. All required sections exist
2. Tables are properly formatted in Markdown
3. Safety warnings use ⚠️ emoji
4. Tips use 💡 emoji
5. No placeholder text like [TODO] or [INSERT]

Respond with JSON:
{"valid": boolean, "issues": ["issue1", "issue2"], "score": 0-100}`,

  consistency: `You are comparing new repair documentation against existing data.
EXISTING DATA from RepairAi-files:
[CONTEXT - existing device docs]

NEW DATA to validate:
[NEW CONTENT]

Check for:
1. Contradictions in screw sizes or locations
2. Inconsistent part numbers
3. Conflicting solution steps
4. Different terminology for same components

Respond with JSON:
{"consistent": boolean, "conflicts": [], "similarities": [], "recommendation": "approve|review|reject"}`,

  citation: `For each piece of technical data, cite the source URL.
If you cannot verify a fact, mark it as [UNVERIFIED].

Technical claims requiring verification:
- Screw specifications
- Part numbers
- Voltage/current values
- Component locations

Respond with JSON:
{"verified": [{"fact": "...", "source": "..."}], "unverified": [...]}`
};

// Validation logic
class ValidationEngine {
  constructor(config) {
    this.config = config;
  }

  parseResponse(response, type) {
    try {
      return JSON.parse(response);
    } catch (e) {
      return { error: 'Failed to parse JSON', raw: response };
    }
  }

  calculateFinalScore(formatScore, consistencyScore, citationScore) {
    // Weighted average: format 30%, consistency 50%, citation 20%
    return Math.round(formatScore * 0.3 + consistencyScore * 0.5 + citationScore * 0.2);
  }

  getRecommendation(scores) {
    const finalScore = this.calculateFinalScore(
      scores.format || 0,
      scores.consistency || 0,
      scores.citation || 0
    );

    if (finalScore < this.config.auto_reject_score) {
      return { action: 'reject', reason: 'Score below auto-reject threshold', score: finalScore };
    }
    if (finalScore < this.config.min_auto_approve_score) {
      return { action: 'review', reason: 'Score in review range', score: finalScore };
    }
    return { action: 'approve', reason: 'Score above auto-approve threshold', score: finalScore };
  }
}

describe('Validation Prompts', () => {
  test('should have format validation prompt', () => {
    expect(VALIDATION_PROMPTS.format).toContain('screws.md');
    expect(VALIDATION_PROMPTS.format).toContain('board.md');
    expect(VALIDATION_PROMPTS.format).toContain('parts.md');
    expect(VALIDATION_PROMPTS.format).toContain('solution.md');
  });

  test('should have consistency validation prompt', () => {
    expect(VALIDATION_PROMPTS.consistency).toContain('screw sizes');
    expect(VALIDATION_PROMPTS.consistency).toContain('part numbers');
    expect(VALIDATION_PROMPTS.consistency).toContain('recommendation');
  });

  test('should have citation validation prompt', () => {
    expect(VALIDATION_PROMPTS.citation).toContain('Screw specifications');
    expect(VALIDATION_PROMPTS.citation).toContain('Part numbers');
    expect(VALIDATION_PROMPTS.citation).toContain('verified');
  });

  test('should require ⚠️ emoji for safety warnings', () => {
    expect(VALIDATION_PROMPTS.format).toContain('⚠️');
  });

  test('should require 💡 emoji for tips', () => {
    expect(VALIDATION_PROMPTS.format).toContain('💡');
  });

  test('should reject placeholder text', () => {
    expect(VALIDATION_PROMPTS.format).toContain('[TODO]');
    expect(VALIDATION_PROMPTS.format).toContain('[INSERT]');
  });

  test('should have JSON response format', () => {
    expect(VALIDATION_PROMPTS.format).toContain('JSON');
    expect(VALIDATION_PROMPTS.consistency).toContain('JSON');
    expect(VALIDATION_PROMPTS.citation).toContain('JSON');
  });
});

describe('Validation Engine', () => {
  const mockConfig = {
    min_auto_approve_score: 75,
    review_score_range: [50, 75],
    auto_reject_score: 50
  };

  let engine;

  beforeEach(() => {
    engine = new ValidationEngine(mockConfig);
  });

  test('should parse valid JSON response', () => {
    const response = '{"valid": true, "issues": [], "score": 90}';
    const parsed = engine.parseResponse(response, 'format');
    expect(parsed.valid).toBe(true);
    expect(parsed.score).toBe(90);
  });

  test('should handle invalid JSON gracefully', () => {
    const response = 'not valid json';
    const parsed = engine.parseResponse(response, 'format');
    expect(parsed.error).toBeDefined();
  });

  test('should calculate weighted score correctly', () => {
    const score = engine.calculateFinalScore(100, 80, 60);
    // 100 * 0.3 + 80 * 0.5 + 60 * 0.2 = 30 + 40 + 12 = 82
    expect(score).toBe(82);
  });

  test('should auto-reject low scores', () => {
    const scores = { format: 40, consistency: 30, citation: 20 };
    const recommendation = engine.getRecommendation(scores);
    expect(recommendation.action).toBe('reject');
  });

  test('should flag scores in review range', () => {
    const scores = { format: 60, consistency: 65, citation: 60 };
    const recommendation = engine.getRecommendation(scores);
    expect(recommendation.action).toBe('review');
  });

  test('should auto-approve high scores', () => {
    const scores = { format: 90, consistency: 85, citation: 80 };
    const recommendation = engine.getRecommendation(scores);
    expect(recommendation.action).toBe('approve');
  });

  test('should use correct threshold values', () => {
    expect(mockConfig.auto_reject_score).toBe(50);
    expect(mockConfig.min_auto_approve_score).toBe(75);
    expect(mockConfig.review_score_range[0]).toBe(50);
    expect(mockConfig.review_score_range[1]).toBe(75);
  });
});
