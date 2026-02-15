/**
 * FZ File Parser
 * Based on OpenBoardView's FZFile.cpp implementation
 * Supports RC6-encrypted and zlib-compressed FZ files
 */

const zlib = require('zlib');

class FZParser {
  constructor() {
    this.keyParity = [
      0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0,
      1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0,
      0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1
    ];
  }

  /**
   * Check if FZ key is valid using parity check
   */
  checkFZKey(fzkey) {
    if (!fzkey || fzkey.length !== 44) return false;
    
    for (let i = 0; i < fzkey.length; i++) {
      let tmp = fzkey[i];
      tmp ^= tmp >> 16;
      tmp ^= tmp >> 8;
      tmp ^= tmp >> 4;
      tmp ^= tmp >> 2;
      tmp ^= tmp >> 1;
      tmp = (~tmp) & 1;
      
      if (tmp !== this.keyParity[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * RC6 decryption
   */
  decode(buffer, key) {
    const logw = 5;
    const r = 20;
    const decoded = Buffer.from(buffer);
    
    let A = 0, B = 0, C = 0, D = 0;
    const ibuf = new Uint8Array(16);

    const rotl32 = (a, b) => {
      return ((a << b) | (a >>> (32 - b))) >>> 0;
    };

    for (let pos = 0; pos < decoded.length; pos++) {
      B = (B + key[0]) >>> 0;
      D = (D + key[1]) >>> 0;
      
      for (let i = 1; i < r + 1; i++) {
        const t = rotl32((B * (2 * B + 1)) >>> 0, logw);
        const u = rotl32((D * (2 * D + 1)) >>> 0, logw);
        A = (rotl32(A ^ t, u) + key[2 * i]) >>> 0;
        C = (rotl32(C ^ u, t) + key[2 * i + 1]) >>> 0;

        const tmp = A;
        A = B;
        B = C;
        C = D;
        D = tmp;
      }
      
      A = (A + key[2 * r + 2]) >>> 0;
      C = (C + key[2 * r + 3]) >>> 0;

      const currentByte = decoded[pos];
      decoded[pos] = currentByte ^ (A & 0xFF);

      // Shift buffer
      for (let i = 0; i < 15; i++) {
        ibuf[i] = ibuf[i + 1];
      }
      ibuf[15] = currentByte;

      // Reconstruct A, B, C, D from buffer (little endian)
      A = ibuf[0] | (ibuf[1] << 8) | (ibuf[2] << 16) | (ibuf[3] << 24);
      B = ibuf[4] | (ibuf[5] << 8) | (ibuf[6] << 16) | (ibuf[7] << 24);
      C = ibuf[8] | (ibuf[9] << 8) | (ibuf[10] << 16) | (ibuf[11] << 24);
      D = ibuf[12] | (ibuf[13] << 8) | (ibuf[14] << 16) | (ibuf[15] << 24);
      
      A >>>= 0; B >>>= 0; C >>>= 0; D >>>= 0;
    }

    return decoded;
  }

  /**
   * Split FZ file into content and description parts
   */
  split(buffer) {
    const len = buffer.readUInt32LE(buffer.length - 4);
    if (len < 0 || len > buffer.length) {
      throw new Error('Invalid FZ file structure');
    }
    
    const descrSize = len;
    const contentSize = buffer.length - descrSize + 4;
    
    const content = buffer.slice(4, contentSize);
    const descr = buffer.slice(contentSize);
    
    return { content, descr };
  }

  /**
   * Decompress zlib data
   */
  decompress(buffer) {
    try {
      return zlib.inflateSync(buffer);
    } catch (error) {
      throw new Error(`Decompression failed: ${error.message}`);
    }
  }

  /**
   * Parse FZ file
   */
  parse(buffer, fzkey) {
    const result = {
      format: 'FZ',
      version: '1.0',
      board: {
        outline: [],
        parts: [],
        pins: [],
        nails: [],
        nets: new Set()
      },
      partsDesc: []
    };

    try {
      // Check if key is valid
      if (!this.checkFZKey(fzkey)) {
        throw new Error('Invalid FZ key');
      }

      let workBuffer = Buffer.from(buffer);

      // Check if file is already decompressed (zlib signature)
      const s1 = workBuffer[4];
      const s2 = workBuffer[5];
      const hasZlibSignature = (s1 === 0x78) && (s2 === 0x9C || s2 === 0xDA);

      if (!hasZlibSignature) {
        // Decode with RC6
        workBuffer = this.decode(workBuffer, fzkey);
      }

      // Split into content and description
      const { content: contentBuf, descr: descrBuf } = this.split(workBuffer);

      // Decompress both parts
      const content = this.decompress(contentBuf).toString('utf8');
      const descr = this.decompress(descrBuf).toString('utf8');

      // Parse content
      this.parseContent(content, result);

      // Parse description
      this.parseDescription(descr, result);

      // Link parts descriptions to parts
      this.linkDescriptions(result);

      // Generate outline if not present
      if (result.board.outline.length === 0) {
        this.generateOutline(result);
      }

      // Convert nets Set to Array
      result.board.nets = Array.from(result.board.nets);

      return result;
    } catch (error) {
      throw new Error(`FZ parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse content part (parts, pins, nails)
   */
  parseContent(content, result) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    let currentBlock = 0;
    let multiplier = 1.0;
    const partsId = {};

    for (const line of lines) {
      // Check for unit specification
      if (line === 'UNIT:millimeters') {
        multiplier = 25.4;
        continue;
      }

      if (line.startsWith('A!')) {
        // New block
        const blockName = line.substring(2);
        if (blockName.startsWith('REFDES')) currentBlock = 1;
        else if (blockName.startsWith('NET_NAME')) currentBlock = 2;
        else if (blockName.startsWith('TESTVIA')) currentBlock = 3;
        else if (blockName.startsWith('GRAPHIC_DATA_NAME')) currentBlock = 4;
        else if (blockName.startsWith('CLASS')) currentBlock = 5;
        else if (blockName.startsWith('LOGOInfo')) currentBlock = 6;
        else if (blockName.startsWith('UnDrawSym')) currentBlock = 7;
        else currentBlock = -1;
        continue;
      }

      if (!line.startsWith('S!')) continue;

      const tokens = line.substring(2).split('!');
      let tokenIndex = 0;
      const readStr = () => tokens[tokenIndex++] || '';
      const readInt = () => parseInt(tokens[tokenIndex++], 10) || 0;
      const readUInt = () => Math.max(0, parseInt(tokens[tokenIndex++], 10) || 0);
      const readDouble = () => parseFloat(tokens[tokenIndex++]) || 0;

      switch (currentBlock) {
        case 1: { // Parts
          const name = readStr();
          readStr(); // cic
          readStr(); // sname
          const smirror = readStr();
          readStr(); // srotate
          
          result.board.parts.push({
            name,
            partType: 'SMD',
            mountingSide: smirror === 'YES' ? 'Top' : 'Bottom',
            endOfPins: 0,
            mfgcode: ''
          });
          partsId[name] = result.board.parts.length;
          break;
        }
        case 2: { // Pins
          const net = readStr();
          const partName = readStr();
          const snum = readStr();
          const name = readStr();
          const posx = readDouble() * multiplier;
          const posy = readDouble() * multiplier;
          const probe = readUInt();
          let radius = readDouble() / 100;
          if (radius < 0.5) radius = 0.5;
          radius *= multiplier;

          const part = partsId[partName] || 0;
          const partData = result.board.parts[part - 1];
          let side = 'Both';
          if (partData) {
            if (partData.mountingSide === 'Top') side = 'Top';
            else if (partData.mountingSide === 'Bottom') side = 'Bottom';
          }

          // Use name field as pin name if snum is empty or "0"
          const pinName = (snum.length <= 1 && (snum === '' || snum === '0')) ? name : snum;

          if (net) result.board.nets.add(net);

          result.board.pins.push({
            x: Math.round(posx),
            y: Math.round(posy),
            probe,
            part,
            net,
            side,
            radius,
            name: pinName
          });
          break;
        }
        case 3: { // Nails
          tokenIndex++; // Skip Y!
          const net = readStr();
          readStr(); // refdes
          readInt(); // pinnumber
          readStr(); // pinname
          const posx = readDouble() * multiplier;
          const posy = readDouble() * multiplier;
          const loc = readStr();
          readDouble(); // radius

          if (net) result.board.nets.add(net);

          result.board.nails.push({
            probe: 0,
            x: Math.round(posx),
            y: Math.round(posy),
            side: loc === 'T' ? 'Top' : 'Bottom',
            net
          });
          break;
        }
      }
    }

    // Update end_of_pins
    result.board.pins.forEach((pin, i) => {
      if (pin.part > 0) {
        result.board.parts[pin.part - 1].endOfPins = i;
      }
    });
  }

  /**
   * Parse description part (parts info)
   */
  parseDescription(descr, result) {
    const lines = descr.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    
    // Skip first 2 lines (board description and column names)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('s')) continue; // Skip lines starting with 's'

      const tokens = line.split('\t');
      if (tokens.length >= 4) {
        result.partsDesc.push({
          partno: tokens[0],
          description: tokens[1],
          quantity: parseInt(tokens[2], 10) || 0,
          locations: tokens[3].split(/[,\s]+/).filter(l => l),
          partno2: tokens[4] || ''
        });
      }
    }
  }

  /**
   * Link descriptions to parts
   */
  linkDescriptions(result) {
    result.partsDesc.forEach(pdesc => {
      pdesc.locations.forEach(partname => {
        const part = result.board.parts.find(p => p.name === partname);
        if (part) {
          part.mfgcode = pdesc.description;
        }
      });
    });
  }

  /**
   * Generate board outline from outermost pins
   */
  generateOutline(result) {
    if (result.board.pins.length === 0) return;

    const MARGIN = 20;
    const xs = result.board.pins.map(p => p.x);
    const ys = result.board.pins.map(p => p.y);
    
    const minx = Math.min(...xs) - MARGIN;
    const maxx = Math.max(...xs) + MARGIN;
    const miny = Math.min(...ys) - MARGIN;
    const maxy = Math.max(...ys) + MARGIN;

    result.board.outline = [
      { x: minx, y: miny },
      { x: maxx, y: miny },
      { x: maxx, y: maxy },
      { x: minx, y: maxy },
      { x: minx, y: miny }
    ];
  }
}

module.exports = FZParser;
