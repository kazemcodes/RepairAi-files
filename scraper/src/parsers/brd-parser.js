/**
 * BRD File Parser
 * Based on OpenBoardView's BRDFile.cpp implementation
 * Supports encoded and plain BRD files
 */

class BRDParser {
  constructor() {
    this.signature = [0x23, 0xe2, 0x63, 0x28];
  }

  /**
   * Verify if buffer is a BRD file
   */
  verifyFormat(buffer) {
    if (buffer.length < this.signature.length) return false;
    
    // Check signature
    const hasSignature = this.signature.every((byte, i) => buffer[i] === byte);
    if (hasSignature) return true;
    
    // Check for text markers
    const text = buffer.toString('utf8');
    return text.includes('str_length:') && text.includes('var_data:');
  }

  /**
   * Decode encoded BRD file
   */
  decode(buffer) {
    const encoded_header = [0x23, 0xe2, 0x63, 0x28];
    const hasEncodedHeader = encoded_header.every((byte, i) => buffer[i] === byte);
    
    if (!hasEncodedHeader) {
      return buffer.toString('utf8');
    }

    // Decode the buffer
    const decoded = Buffer.from(buffer);
    for (let i = 0; i < decoded.length; i++) {
      let x = decoded[i];
      if (!(x === 0x0d || x === 0x0a || x === 0)) {
        const c = x;
        x = ~(((c >> 6) & 3) | (c << 2)) & 0xff;
      }
      decoded[i] = x;
    }
    
    return decoded.toString('utf8');
  }

  /**
   * Parse BRD file
   */
  parse(buffer) {
    const result = {
      format: 'BRD',
      version: '1.0',
      board: {
        outline: [],
        parts: [],
        pins: [],
        nails: [],
        nets: new Set()
      },
      metadata: {
        num_format: 0,
        num_parts: 0,
        num_pins: 0,
        num_nails: 0
      }
    };

    try {
      const content = this.decode(buffer);
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);

      let currentBlock = 0;
      let lineIndex = 0;

      while (lineIndex < lines.length) {
        const line = lines[lineIndex++];
        
        if (line === 'str_length:') {
          currentBlock = 1;
          continue;
        }
        if (line === 'var_data:') {
          currentBlock = 2;
          continue;
        }
        if (line === 'Format:' || line === 'format:') {
          currentBlock = 3;
          continue;
        }
        if (line === 'Parts:' || line === 'Pins1:') {
          currentBlock = 4;
          continue;
        }
        if (line === 'Pins:' || line === 'Pins2:') {
          currentBlock = 5;
          continue;
        }
        if (line === 'Nails:') {
          currentBlock = 6;
          continue;
        }

        const tokens = line.split(/\s+/);
        let tokenIndex = 0;

        const readInt = () => parseInt(tokens[tokenIndex++], 10);
        const readUInt = () => {
          const val = parseInt(tokens[tokenIndex++], 10);
          return val >= 0 ? val : 0;
        };
        const readStr = () => tokens[tokenIndex++] || '';

        switch (currentBlock) {
          case 2: { // var_data
            result.metadata.num_format = readUInt();
            result.metadata.num_parts = readUInt();
            result.metadata.num_pins = readUInt();
            result.metadata.num_nails = readUInt();
            break;
          }
          case 3: { // Format (board outline)
            if (result.board.outline.length < result.metadata.num_format) {
              result.board.outline.push({
                x: readInt(),
                y: readInt()
              });
            }
            break;
          }
          case 4: { // Parts
            if (result.board.parts.length < result.metadata.num_parts) {
              const name = readStr();
              const tmp = readUInt();
              const partType = (tmp & 0xc) ? 'SMD' : 'ThroughHole';
              
              let mountingSide = 'Both';
              if (tmp === 1 || (4 <= tmp && tmp < 8)) mountingSide = 'Top';
              if (tmp === 2 || (8 <= tmp)) mountingSide = 'Bottom';
              
              const endOfPins = readUInt();
              
              result.board.parts.push({
                name,
                partType,
                mountingSide,
                endOfPins,
                mfgcode: ''
              });
            }
            break;
          }
          case 5: { // Pins
            if (result.board.pins.length < result.metadata.num_pins) {
              const x = readInt();
              const y = readInt();
              const probe = readInt();
              const part = readUInt();
              const net = readStr();
              
              if (net) result.board.nets.add(net);
              
              const partData = result.board.parts[part - 1];
              let side = 'Both';
              if (partData) {
                if (partData.mountingSide === 'Top') side = 'Top';
                else if (partData.mountingSide === 'Bottom') side = 'Bottom';
              }
              
              result.board.pins.push({
                x,
                y,
                probe,
                part,
                net,
                side,
                radius: 0.5
              });
            }
            break;
          }
          case 6: { // Nails
            if (result.board.nails.length < result.metadata.num_nails) {
              const probe = readUInt();
              const x = readInt();
              const y = readInt();
              const sideNum = readUInt();
              const net = readStr();
              
              if (net) result.board.nets.add(net);
              
              result.board.nails.push({
                probe,
                x,
                y,
                side: sideNum === 1 ? 'Top' : 'Bottom',
                net
              });
            }
            break;
          }
        }
      }

      // Convert nets Set to Array
      result.board.nets = Array.from(result.board.nets);

      // Link pins to nails for Lenovo variant
      const nailsToNets = {};
      result.board.nails.forEach(nail => {
        nailsToNets[nail.probe] = nail.net;
      });

      result.board.pins.forEach(pin => {
        if (!pin.net || pin.net === '') {
          pin.net = nailsToNets[pin.probe] || 'UNCONNECTED';
        }
      });

      return result;
    } catch (error) {
      throw new Error(`BRD parsing failed: ${error.message}`);
    }
  }
}

module.exports = BRDParser;
