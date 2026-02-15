/**
 * ASC File Parser
 * Based on OpenBoardView's ASCFile.cpp implementation
 * Parses format.asc, pins.asc, and nails.asc files
 */

const fs = require('fs');
const path = require('path');

class ASCParser {
  /**
   * Parse ASC files from a directory
   * Expects format.asc, pins.asc, and nails.asc in the same directory
   */
  parse(filePath) {
    const result = {
      format: 'ASC',
      version: '1.0',
      board: {
        outline: [],
        parts: [],
        pins: [],
        nails: [],
        nets: new Set()
      }
    };

    try {
      const directory = path.dirname(filePath);

      // Parse format.asc
      this.parseFormat(directory, result);

      // Parse pins.asc
      this.parsePins(directory, result);

      // Parse nails.asc
      this.parseNails(directory, result);

      // Convert nets Set to Array
      result.board.nets = Array.from(result.board.nets);

      return result;
    } catch (error) {
      throw new Error(`ASC parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse format.asc file
   */
  parseFormat(directory, result) {
    const formatPath = this.findFile(directory, 'format.asc');
    if (!formatPath) return;

    const content = fs.readFileSync(formatPath, 'utf8');
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    // Skip first 8 lines (header)
    for (let i = 8; i < lines.length; i++) {
      const tokens = lines[i].split(/\s+/);
      if (tokens.length >= 2) {
        const x = parseFloat(tokens[0]);
        const y = parseFloat(tokens[1]);
        result.board.outline.push({
          x: Math.round(x * 1000), // Convert to mils
          y: Math.round(y * 1000)
        });
      }
    }
  }

  /**
   * Parse pins.asc file
   */
  parsePins(directory, result) {
    const pinsPath = this.findFile(directory, 'pins.asc');
    if (!pinsPath) return;

    const content = fs.readFileSync(pinsPath, 'utf8');
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    // Skip first 8 lines (header)
    for (let i = 8; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('Part')) {
        const tokens = line.split(/\s+/);
        const name = tokens[1];
        const loc = tokens[2];
        
        result.board.parts.push({
          name,
          partType: 'SMD',
          mountingSide: loc === '(T)' ? 'Top' : 'Bottom',
          endOfPins: 0,
          mfgcode: ''
        });
      } else {
        // Parse pin line
        // Format: ID NAME X Y LAYER NET PROBE
        // NAME can contain spaces, so we need special handling
        const match = line.match(/^(\d+)\s+(.+?)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(\d+)\s+(\S+)\s+(\d+)$/);
        if (match) {
          const [, id, name, x, y, layer, net, probe] = match;
          
          if (net) result.board.nets.add(net);
          
          const part = result.board.parts.length;
          const partData = result.board.parts[part - 1];
          let side = 'Both';
          if (partData) {
            if (partData.mountingSide === 'Top') side = 'Top';
            else if (partData.mountingSide === 'Bottom') side = 'Bottom';
          }
          
          result.board.pins.push({
            x: Math.round(parseFloat(x) * 1000),
            y: Math.round(parseFloat(y) * 1000),
            probe: parseInt(probe, 10),
            part,
            net,
            side,
            radius: 0.5,
            name: name.trim()
          });
          
          if (partData) {
            partData.endOfPins = result.board.pins.length;
          }
        }
      }
    }
  }

  /**
   * Parse nails.asc file
   */
  parseNails(directory, result) {
    const nailsPath = this.findFile(directory, 'nails.asc');
    if (!nailsPath) return;

    const content = fs.readFileSync(nailsPath, 'utf8');
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    // Skip first 7 lines (header)
    for (let i = 7; i < lines.length; i++) {
      const line = lines[i];
      const tokens = line.split(/\s+/);
      
      if (tokens.length >= 8) {
        let tokenIndex = 1; // Skip first char
        const probe = parseInt(tokens[tokenIndex++], 10);
        const x = parseFloat(tokens[tokenIndex++]);
        const y = parseFloat(tokens[tokenIndex++]);
        const type = parseInt(tokens[tokenIndex++], 10);
        const grid = tokens[tokenIndex++];
        const loc = tokens[tokenIndex++];
        const netid = tokens[tokenIndex++];
        const net = tokens[tokenIndex++];
        
        if (net) result.board.nets.add(net);
        
        result.board.nails.push({
          probe,
          x: Math.round(x * 1000),
          y: Math.round(y * 1000),
          side: loc === '(T)' ? 'Top' : 'Bottom',
          net
        });
      }
    }
  }

  /**
   * Find file case-insensitively
   */
  findFile(directory, filename) {
    try {
      const files = fs.readdirSync(directory);
      const found = files.find(f => f.toLowerCase() === filename.toLowerCase());
      return found ? path.join(directory, found) : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = ASCParser;
