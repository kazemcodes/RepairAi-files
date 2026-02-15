# Boardview File Parsers

JavaScript implementations of boardview file format parsers based on [OpenBoardView](https://github.com/OpenBoardView/OpenBoardView).

## Supported Formats

### 1. BRD Format
- **Extensions**: `.brd`
- **Description**: Binary/text format used by various boardview tools
- **Features**:
  - Encoded and plain text variants
  - Board outline, parts, pins, nails
  - Net information
  - Test points

### 2. BDV Format
- **Extensions**: `.bdv`, `.bv`
- **Description**: Encoded boardview format
- **Features**:
  - XOR-based encoding
  - Similar structure to BRD
  - Top/bottom side information

### 3. ASC Format
- **Extensions**: `.asc`
- **Description**: ASCII text format (ASUS)
- **Features**:
  - Multiple files: `format.asc`, `pins.asc`, `nails.asc`
  - Human-readable text format
  - Coordinate-based layout

### 4. FZ Format
- **Extensions**: `.fz`
- **Description**: RC6-encrypted and zlib-compressed format
- **Features**:
  - RC6 encryption (requires key)
  - Zlib compression
  - Part descriptions
  - Most complex format

## Usage

### Basic Parsing

```javascript
const { parseFile } = require('./src/parsers');
const fs = require('fs');

// Read file
const buffer = fs.readFileSync('board.brd');

// Parse automatically
const result = parseFile(buffer, 'board.brd');

console.log(`Format: ${result.format}`);
console.log(`Parts: ${result.board.parts.length}`);
console.log(`Pins: ${result.board.pins.length}`);
```

### Format-Specific Parsing

```javascript
const { BRDParser, BDVParser, ASCParser, FZParser } = require('./src/parsers');

// BRD format
const brdParser = new BRDParser();
if (brdParser.verifyFormat(buffer)) {
  const result = brdParser.parse(buffer);
}

// BDV format
const bdvParser = new BDVParser();
if (bdvParser.verifyFormat(buffer)) {
  const result = bdvParser.parse(buffer);
}

// ASC format (requires file path)
const ascParser = new ASCParser();
const result = ascParser.parse('/path/to/pins.asc');

// FZ format (requires encryption key)
const fzParser = new FZParser();
const fzkey = [/* 44 uint32 values */];
const result = fzParser.parse(buffer, fzkey);
```

### Using the CLI

```bash
# Convert single file
node src/index.js boardview-convert --input board.brd --output ./output

# Convert directory
node src/index.js boardview-convert --input ./boards --output ./output

# Generate SVG
node src/index.js boardview-convert --input board.brd --output ./output --generateSVG

# FZ file with key
node src/index.js boardview-convert --input board.fz --output ./output --fzkey "key.txt"
```

## Output Format

All parsers produce a standardized JSON structure:

```json
{
  "format": "BRD",
  "version": "1.0",
  "board": {
    "outline": [
      { "x": 100, "y": 200 },
      { "x": 300, "y": 400 }
    ],
    "parts": [
      {
        "name": "U1",
        "partType": "SMD",
        "mountingSide": "Top",
        "endOfPins": 10,
        "mfgcode": "IC Description"
      }
    ],
    "pins": [
      {
        "x": 150,
        "y": 250,
        "probe": 1,
        "part": 1,
        "net": "GND",
        "side": "Top",
        "radius": 5,
        "name": "1"
      }
    ],
    "nails": [
      {
        "probe": 1,
        "x": 500,
        "y": 600,
        "side": "Top",
        "net": "VCC"
      }
    ],
    "nets": ["GND", "VCC", "DATA"]
  },
  "metadata": {
    "num_format": 4,
    "num_parts": 10,
    "num_pins": 50,
    "num_nails": 5
  }
}
```

## Data Structures

### Part
```javascript
{
  name: string,           // Component reference (e.g., "U1", "R5")
  partType: string,       // "SMD" or "ThroughHole"
  mountingSide: string,   // "Top", "Bottom", or "Both"
  endOfPins: number,      // Index of last pin
  mfgcode: string         // Manufacturer code/description
}
```

### Pin
```javascript
{
  x: number,              // X coordinate (mils)
  y: number,              // Y coordinate (mils)
  probe: number,          // Probe/test point number
  part: number,           // Part index (1-based)
  net: string,            // Net name
  side: string,           // "Top", "Bottom", or "Both"
  radius: number,         // Pin radius (mils)
  name: string            // Pin name/number
}
```

### Nail (Test Point)
```javascript
{
  probe: number,          // Probe number
  x: number,              // X coordinate (mils)
  y: number,              // Y coordinate (mils)
  side: string,           // "Top" or "Bottom"
  net: string             // Net name
}
```

## Implementation Details

### BRD Parser
- Detects encoded files by signature `[0x23, 0xe2, 0x63, 0x28]`
- Decodes using bitwise operations
- Parses text-based sections
- Supports Lenovo variant (links pins to nails)

### BDV Parser
- XOR-based decoding with incrementing key
- Key starts at 0xa0, increments on newlines
- Wraps at 285 back to 159
- Similar structure to BRD

### ASC Parser
- Reads multiple files from directory
- Case-insensitive file lookup
- Handles pin names with spaces
- Converts coordinates to mils (×1000)

### FZ Parser
- RC6 stream cipher decryption
- 44-element uint32 key with parity check
- Zlib decompression of content and description
- Supports millimeter units (converts to mils)
- Generates outline from pin bounds if missing

## Testing

```bash
# Run tests
npm test

# Run specific test
npm test -- parsers.test.js

# Run with coverage
npm test -- --coverage
```

## FZ Encryption Keys

FZ files require a 44-element uint32 array key. Keys are device/board specific and not included in this repository.

Key format:
```javascript
const fzkey = [
  0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222,
  // ... 40 more values
];
```

The parser validates keys using parity bits before attempting decryption.

## Coordinate System

- All coordinates are in **mils** (thousandths of an inch)
- Origin is typically top-left
- Y-axis points down
- Some formats use millimeters (automatically converted)

## SVG Generation

The converter can generate SVG visualizations:

```javascript
const { generateSVG } = require('./src/commands/boardview-convert');

const svg = generateSVG(parsedData, {
  minX, maxX, minY, maxY,
  width, height, padding,
  showTop: true,
  showBottom: true,
  showNails: true
});
```

SVG features:
- Color-coded pins by side (green=top, blue=bottom, orange=both)
- Board outline
- Test points (nails) in red
- Part labels
- Hover data attributes (net, part)

## Error Handling

All parsers throw descriptive errors:

```javascript
try {
  const result = parseFile(buffer, filePath);
} catch (error) {
  if (error.message.includes('Invalid FZ key')) {
    // Handle key error
  } else if (error.message.includes('Unknown format')) {
    // Handle format detection error
  } else {
    // Handle parsing error
  }
}
```

## Performance

- BRD/BDV: Fast (< 100ms for typical boards)
- ASC: Fast (< 100ms, multiple file reads)
- FZ: Slower (decryption + decompression, ~500ms)

Memory usage scales with board complexity:
- Small boards (< 100 parts): ~1-5 MB
- Medium boards (100-500 parts): ~5-20 MB
- Large boards (> 500 parts): ~20-100 MB

## Contributing

When adding support for new formats:

1. Create parser in `src/parsers/`
2. Implement `verifyFormat()` and `parse()` methods
3. Return standardized JSON structure
4. Add tests in `tests/parsers.test.js`
5. Update this README

## References

- [OpenBoardView](https://github.com/OpenBoardView/OpenBoardView) - Original C++ implementation
- [RC6 Cipher](https://en.wikipedia.org/wiki/RC6) - Encryption algorithm used in FZ format
- [Zlib](https://www.zlib.net/) - Compression library

## License

Based on OpenBoardView, which is licensed under MIT License.
