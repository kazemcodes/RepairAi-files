/**
 * Tests for boardview file parsers
 */

const { BRDParser, BDVParser, ASCParser, FZParser, parseFile } = require('../src/parsers');

describe('Boardview Parsers', () => {
  describe('BRDParser', () => {
    test('should verify BRD format with signature', () => {
      const parser = new BRDParser();
      const buffer = Buffer.from([0x23, 0xe2, 0x63, 0x28, 0x00, 0x00]);
      expect(parser.verifyFormat(buffer)).toBe(true);
    });

    test('should verify BRD format with text markers', () => {
      const parser = new BRDParser();
      const buffer = Buffer.from('str_length:\nvar_data:\n');
      expect(parser.verifyFormat(buffer)).toBe(true);
    });

    test('should decode encoded BRD file', () => {
      const parser = new BRDParser();
      const buffer = Buffer.from([0x23, 0xe2, 0x63, 0x28, 0x41, 0x42]);
      const decoded = parser.decode(buffer);
      expect(decoded).toBeDefined();
      expect(typeof decoded).toBe('string');
    });

    test('should parse simple BRD file', () => {
      const parser = new BRDParser();
      const content = `str_length:
var_data:
4 2 3 1
Format:
100 200
300 400
Parts:
U1 1 0
U2 2 1
Pins:
100 200 1 1 GND
150 250 2 1 VCC
Nails:
1 500 600 1 GND
`;
      const buffer = Buffer.from(content);
      const result = parser.parse(buffer);
      
      expect(result.format).toBe('BRD');
      expect(result.board.parts.length).toBe(2);
      expect(result.board.pins.length).toBe(2);
      expect(result.board.nails.length).toBe(1);
      expect(result.board.outline.length).toBe(2);
    });
  });

  describe('BDVParser', () => {
    test('should verify BDV format', () => {
      const parser = new BDVParser();
      const buffer = Buffer.from('<<format.asc>>\n<<pins.asc>>');
      expect(parser.verifyFormat(buffer)).toBe(true);
    });

    test('should decode BDV file', () => {
      const parser = new BDVParser();
      const buffer = Buffer.from([0x41, 0x42, 0x43, 0x0d, 0x0a, 0x44]);
      const decoded = parser.decode(buffer);
      expect(decoded).toBeDefined();
    });
  });

  describe('FZParser', () => {
    test('should check FZ key validity', () => {
      const parser = new FZParser();
      
      // Invalid key (all zeros)
      const invalidKey = new Array(44).fill(0);
      expect(parser.checkFZKey(invalidKey)).toBe(false);
      
      // Invalid key (wrong length)
      expect(parser.checkFZKey([1, 2, 3])).toBe(false);
    });

    test('should have correct key parity', () => {
      const parser = new FZParser();
      expect(parser.keyParity.length).toBe(44);
      expect(parser.keyParity[0]).toBe(0);
      expect(parser.keyParity[1]).toBe(1);
    });
  });

  describe('parseFile', () => {
    test('should detect BRD format', () => {
      const buffer = Buffer.from('str_length:\nvar_data:\n');
      const result = parseFile(buffer, 'test.brd');
      expect(result.format).toBe('BRD');
    });

    test('should detect BDV format', () => {
      const buffer = Buffer.from('<<format.asc>>\n<<pins.asc>>');
      const result = parseFile(buffer, 'test.bdv');
      expect(result.format).toBe('BDV');
    });

    test('should throw error for unknown format', () => {
      const buffer = Buffer.from('unknown format');
      expect(() => parseFile(buffer, 'test.unknown')).toThrow();
    });
  });

  describe('Data Structure Validation', () => {
    test('parsed result should have correct structure', () => {
      const parser = new BRDParser();
      const content = `str_length:
var_data:
1 1 1 0
Format:
100 200
Parts:
U1 1 0
Pins:
100 200 1 1 GND
`;
      const buffer = Buffer.from(content);
      const result = parser.parse(buffer);
      
      // Check structure
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('board');
      expect(result).toHaveProperty('metadata');
      
      // Check board structure
      expect(result.board).toHaveProperty('outline');
      expect(result.board).toHaveProperty('parts');
      expect(result.board).toHaveProperty('pins');
      expect(result.board).toHaveProperty('nails');
      expect(result.board).toHaveProperty('nets');
      
      // Check arrays
      expect(Array.isArray(result.board.outline)).toBe(true);
      expect(Array.isArray(result.board.parts)).toBe(true);
      expect(Array.isArray(result.board.pins)).toBe(true);
      expect(Array.isArray(result.board.nails)).toBe(true);
      expect(Array.isArray(result.board.nets)).toBe(true);
    });

    test('parts should have correct properties', () => {
      const parser = new BRDParser();
      const content = `str_length:
var_data:
0 1 0 0
Parts:
U1 1 0
`;
      const buffer = Buffer.from(content);
      const result = parser.parse(buffer);
      
      const part = result.board.parts[0];
      expect(part).toHaveProperty('name');
      expect(part).toHaveProperty('partType');
      expect(part).toHaveProperty('mountingSide');
      expect(part).toHaveProperty('endOfPins');
      expect(part).toHaveProperty('mfgcode');
    });

    test('pins should have correct properties', () => {
      const parser = new BRDParser();
      const content = `str_length:
var_data:
0 1 1 0
Parts:
U1 1 0
Pins:
100 200 1 1 GND
`;
      const buffer = Buffer.from(content);
      const result = parser.parse(buffer);
      
      const pin = result.board.pins[0];
      expect(pin).toHaveProperty('x');
      expect(pin).toHaveProperty('y');
      expect(pin).toHaveProperty('probe');
      expect(pin).toHaveProperty('part');
      expect(pin).toHaveProperty('net');
      expect(pin).toHaveProperty('side');
      expect(pin).toHaveProperty('radius');
    });
  });
});
