/**
 * Boardview File Format Parsers
 * Based on OpenBoardView implementations
 */

const BRDParser = require('./brd-parser');
const BDVParser = require('./bdv-parser');
const ASCParser = require('./asc-parser');
const FZParser = require('./fz-parser');

/**
 * Auto-detect and parse boardview file
 */
function parseFile(buffer, filePath, options = {}) {
  // Try BRD format
  const brdParser = new BRDParser();
  if (brdParser.verifyFormat(buffer)) {
    return brdParser.parse(buffer);
  }

  // Try BDV format
  const bdvParser = new BDVParser();
  if (bdvParser.verifyFormat(buffer)) {
    return bdvParser.parse(buffer);
  }

  // Try FZ format (requires key)
  if (options.fzkey) {
    const fzParser = new FZParser();
    try {
      return fzParser.parse(buffer, options.fzkey);
    } catch (error) {
      // FZ parsing failed, try other formats
    }
  }

  // Try ASC format (requires directory with multiple files)
  if (filePath && filePath.toLowerCase().endsWith('.asc')) {
    const ascParser = new ASCParser();
    try {
      return ascParser.parse(filePath);
    } catch (error) {
      // ASC parsing failed
    }
  }

  throw new Error('Unknown or unsupported boardview file format');
}

/**
 * Get parser for specific format
 */
function getParser(format) {
  switch (format.toUpperCase()) {
    case 'BRD':
      return new BRDParser();
    case 'BDV':
      return new BDVParser();
    case 'ASC':
      return new ASCParser();
    case 'FZ':
      return new FZParser();
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

module.exports = {
  BRDParser,
  BDVParser,
  ASCParser,
  FZParser,
  parseFile,
  getParser
};
