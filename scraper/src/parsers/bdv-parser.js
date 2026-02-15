/**
 * BDV File Parser
 * Based on OpenBoardView's BDVFile.cpp implementation
 * Supports encoded BDV files
 */

class BDVParser {
  /**
   * Verify if buffer is a BDV file
   */
  verifyFormat(buffer) {
    const text = buffer.toString('utf8');
    return text.includes('dd:1.3?,r?-=bb') || 
           (text.includes('<<format.asc>>') && text.includes('<<pins.asc>>'));
  }

  /**
   * Decode BDV file
   */
  decode(buffer) {
    const decoded = Buffer.from(buffer);
    let count = 0xa0; // First key

    for (let i = 0; i < decoded.length; i++) {
      // Increment key on each new line
      if (decoded[i] === 0x0d && decoded[i + 1] === 0x0a) {
        count++;
      }
      
      let x = decoded[i];
      if (!(x === 0x0d || x === 0x0a || x === 0)) {
        x = (count - x) & 0xff;
      }
      
      if (count > 285) count = 159;
      decoded[i] = x;
    }

    return decoded.toString('utf8');
  }

  /**
   * Parse BDV file
   */
  parse(buffer) {
    const result = {
      format: 'BDV',
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
      const content = this.decode(buffer);
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);

      let currentBlock = 0;
      let lineIndex = 0;

      while (lineIndex < lines.length) {
        const line = lines[lineIndex++];

        if (line === '<<format.asc>>') {
          currentBlock = 1;
          lineIndex += 8; // Skip 8 unused lines
          continue;
        }
        if (line === '<<pins.asc>>') {
          currentBlock = 2;
          lineIndex += 8; // Skip 8 unused lines
          continue;
        }
        if (line === '<<nails.asc>>') {
          currentBlock = 3;
          lineIndex += 7; // Skip 7 unused lines
          continue;
        }

        const tokens = line.split(/\s+/);
        let tokenIndex = 0;

        const readInt = () => parseInt(tokens[tokenIndex++], 10);
        const readUInt = () => {
          const val = parseInt(tokens[tokenIndex++], 10);
          return val >= 0 ? val : 0;
        };
        const readDouble = () => parseFloat(tokens[tokenIndex++]);
        const readStr = () => tokens[tokenIndex++] || '';

        switch (currentBlock) {
          case 1: { // Format (board outline)
            const x = readDouble();
            const y = readDouble();
            result.board.outline.push({
              x: Math.round(x * 1000), // Convert to mils
              y: Math.round(y * 1000)
            });
            break;
          }
          case 2: { // Parts & Pins
            if (line.startsWith('Part')) {
              const name = readStr();
              const loc = readStr();
              
              result.board.parts.push({
                name,
                partType: 'SMD',
                mountingSide: loc === '(T)' ? 'Top' : 'Bottom',
                endOfPins: 0,
                mfgcode: ''
              });
            } else {
              const id = readInt();
              const name = readStr();
              const x = readDouble();
              const y = readDouble();
              const layer = readInt();
              const net = readStr();
              const probe = readUInt();
              
              if (net) result.board.nets.add(net);
              
              const part = result.board.parts.length;
              const partData = result.board.parts[part - 1];
              let side = 'Both';
              if (partData) {
                if (partData.mountingSide === 'Top') side = 'Top';
                else if (partData.mountingSide === 'Bottom') side = 'Bottom';
              }
              
              result.board.pins.push({
                x: Math.round(x * 1000),
                y: Math.round(y * 1000),
                probe,
                part,
                net,
                side,
                radius: 0.5,
                name
              });
              
              if (partData) {
                partData.endOfPins = result.board.pins.length;
              }
            }
            break;
          }
          case 3: { // Nails
            tokenIndex++; // Skip first char
            const probe = readUInt();
            const x = readDouble();
            const y = readDouble();
            const type = readInt();
            const grid = readStr();
            const loc = readStr();
            const netid = readStr();
            const net = readStr();
            
            if (net) result.board.nets.add(net);
            
            result.board.nails.push({
              probe,
              x: Math.round(x * 1000),
              y: Math.round(y * 1000),
              side: loc === '(T)' ? 'Top' : 'Bottom',
              net
            });
            break;
          }
        }
      }

      // Convert nets Set to Array
      result.board.nets = Array.from(result.board.nets);

      return result;
    } catch (error) {
      throw new Error(`BDV parsing failed: ${error.message}`);
    }
  }
}

module.exports = BDVParser;
