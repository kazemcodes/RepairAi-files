# BoardView Integration Guide

## Overview

This guide explains how to integrate interactive boardview files (.brd, .bv, .bdv) into RepairAI, allowing users to view PCB layouts with component locations, similar to OpenBoardView and commercial tools like DZKJ.

## What are BoardView Files?

BoardView files are searchable PCB layout files that show:
- Component locations and references (U1, C5, R10, etc.)
- Pin locations and numbers
- Net connections
- Board outline
- Test points
- Component values and part numbers

### Common Formats

| Format | Description | Tool | Common Use |
|--------|-------------|------|------------|
| .BRD | TopTest BoardView R3/R4 | TopTest | Laptops, phones |
| .BV | ATE BoardView | ATE | General PCBs |
| .BDV | HONHAN BoardView | HONHAN | Laptops |
| .ASC | ASUS TSICT | ASUS | ASUS boards |
| .FZ | PCB Repair Tool | Various | Phone repairs |
| .CAD | Allegro | Cadence | Professional |

## Existing Resources

### Open Source Tools

1. **OpenBoardView** ⭐ Recommended
   - GitHub: https://github.com/OpenBoardView/OpenBoardView
   - License: MIT
   - Supports: .brd, .bv, .bdv, .asc, .fz
   - Cross-platform (Windows, macOS, Linux)
   - Active development

2. **boardview-tools**
   - GitHub: https://github.com/nitrocaster/boardview-tools
   - Decode BRD/BDV files
   - Convert to readable formats

3. **bv2bvr**
   - GitHub: https://github.com/inflex/bv2bvr
   - Convert BV to BVR (readable by OpenBoardView)

### BoardView File Sources

1. **alisaler.com** - Laptop boardviews
2. **gadget-manual.com** - Phone and laptop boardviews
3. **alifixit.com** - Various device boardviews
4. **Community contributions** - User-uploaded files

## Implementation Strategy

### Phase 1: File Collection & Conversion

1. **Collect BoardView Files**
   - Search for iPhone/Samsung boardview files
   - Download from community sources
   - Accept user contributions

2. **Convert to Web-Friendly Format**
   - Use OpenBoardView to parse files
   - Extract component data to JSON
   - Generate SVG/PNG layer images
   - Create interactive web format

3. **Organize in Repository**
   ```
   repairai-files/
   ├── apple/
   │   ├── iphone-11/
   │   │   ├── boardview/
   │   │   │   ├── boardview.json      # Parsed data
   │   │   │   ├── board-top.svg       # Top layer
   │   │   │   ├── board-bottom.svg    # Bottom layer
   │   │   │   ├── original.brd        # Original file
   │   │   │   └── _sources.json       # Attribution
   │   │   └── ...
   │   └── ...
   └── samsung/
       └── ...
   ```

### Phase 2: Web Viewer Implementation

#### Technology Stack

**Option A: Port OpenBoardView to Web**
- Use Emscripten to compile C++ to WebAssembly
- Pros: Full compatibility, all features
- Cons: Large bundle size, complex build

**Option B: Custom JavaScript Viewer**
- Parse converted JSON files
- Render with Canvas/SVG
- Pros: Lightweight, customizable
- Cons: Need to implement all features

**Option C: Hybrid Approach** ⭐ Recommended
- Convert files server-side with OpenBoardView
- Serve JSON + SVG to web viewer
- Lightweight JavaScript viewer
- Best of both worlds

#### Viewer Features

```typescript
interface BoardViewData {
  version: string;
  board: {
    width: number;
    height: number;
    outline: Point[];
  };
  components: Component[];
  nets: Net[];
  pins: Pin[];
}

interface Component {
  ref: string;           // e.g., "U1", "C5"
  type: string;          // e.g., "IC", "capacitor"
  value?: string;        // e.g., "10uF", "STM32"
  package: string;       // e.g., "BGA-256", "0402"
  x: number;
  y: number;
  rotation: number;
  side: 'top' | 'bottom';
  pins: string[];        // Pin numbers
}

interface Net {
  name: string;          // e.g., "VCC_3V3", "GND"
  pins: string[];        // e.g., ["U1.5", "C1.1"]
}

interface Pin {
  component: string;     // e.g., "U1"
  number: string;        // e.g., "5"
  net: string;          // e.g., "VCC_3V3"
  x: number;
  y: number;
}
```

### Phase 3: Mobile App Integration

#### Flutter Implementation

```dart
// Add dependencies to pubspec.yaml
dependencies:
  flutter_svg: ^2.0.0
  photo_view: ^0.14.0
  http: ^1.1.0

// BoardView viewer widget
class BoardViewViewer extends StatefulWidget {
  final String manufacturer;
  final String model;
  
  @override
  State<BoardViewViewer> createState() => _BoardViewViewerState();
}

class _BoardViewViewerState extends State<BoardViewViewer> {
  BoardViewData? _boardData;
  String? _selectedComponent;
  Set<String> _highlightedNets = {};
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Board canvas
        InteractiveViewer(
          child: CustomPaint(
            painter: BoardViewPainter(
              boardData: _boardData,
              selectedComponent: _selectedComponent,
              highlightedNets: _highlightedNets,
            ),
          ),
        ),
        
        // Search bar
        Positioned(
          top: 16,
          left: 16,
          right: 16,
          child: SearchBar(
            onSearch: _searchComponent,
          ),
        ),
        
        // Component info panel
        if (_selectedComponent != null)
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: ComponentInfoCard(
              component: _getComponent(_selectedComponent!),
              onHighlightNet: _highlightNet,
            ),
          ),
      ],
    );
  }
}
```

## User Contribution System

### Contribution Workflow

1. **Upload BoardView File**
   - User uploads .brd/.bv/.bdv file
   - System validates file format
   - Checks for existing device

2. **Automatic Processing**
   - Parse file with OpenBoardView
   - Extract component data
   - Generate preview images
   - Create JSON format

3. **Manual Review**
   - Verify device information
   - Check component accuracy
   - Add missing metadata
   - Test viewer functionality

4. **Approval & Publishing**
   - Moderator reviews submission
   - Approves or requests changes
   - Merges to main repository
   - Updates index

### Contribution Portal

```typescript
// Upload form
interface BoardViewUpload {
  device: {
    manufacturer: string;
    model: string;
    variant?: string;
  };
  file: File;              // .brd, .bv, .bdv, etc.
  metadata: {
    source: string;        // Where did you get this?
    license: string;       // License information
    boardRevision?: string;
    notes?: string;
  };
  contributor: {
    name: string;
    email: string;
    github?: string;
  };
}
```

### API Endpoints

```
POST /api/boardview/contribute
Body: FormData with file + metadata
Response: { submissionId, status }

GET /api/boardview/submissions/:id
Response: SubmissionStatus

GET /api/boardview/:manufacturer/:model
Response: BoardViewData (JSON)

GET /api/boardview/:manufacturer/:model/preview
Response: PNG image

GET /api/boardview/:manufacturer/:model/download
Response: Original .brd file
```

## Conversion Pipeline

### Server-Side Processing

```javascript
// Node.js conversion service
const { exec } = require('child_process');
const fs = require('fs').promises;

async function convertBoardView(inputFile, outputDir) {
  // 1. Parse with OpenBoardView CLI
  const obv = await exec(`openboardview-cli parse ${inputFile}`);
  
  // 2. Extract data
  const boardData = JSON.parse(obv.stdout);
  
  // 3. Generate SVG layers
  await exec(`openboardview-cli render ${inputFile} --output ${outputDir}/board-top.svg --side top`);
  await exec(`openboardview-cli render ${inputFile} --output ${outputDir}/board-bottom.svg --side bottom`);
  
  // 4. Create JSON
  const json = {
    version: '1.0',
    board: boardData.board,
    components: boardData.components,
    nets: boardData.nets,
    pins: boardData.pins,
  };
  
  await fs.writeFile(
    `${outputDir}/boardview.json`,
    JSON.stringify(json, null, 2)
  );
  
  // 5. Generate preview
  await exec(`openboardview-cli screenshot ${inputFile} --output ${outputDir}/preview.png`);
  
  return json;
}
```

### Batch Conversion Script

```bash
#!/bin/bash
# convert-boardviews.sh

INPUT_DIR="./boardview-files"
OUTPUT_DIR="../repairai-files"

for file in "$INPUT_DIR"/*.{brd,bv,bdv}; do
  if [ -f "$file" ]; then
    # Extract device info from filename
    # e.g., "iPhone_11_Pro_820-01523.brd"
    filename=$(basename "$file")
    device=$(echo "$filename" | sed 's/\.[^.]*$//')
    
    echo "Converting: $device"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR/$device/boardview"
    
    # Convert
    node convert-boardview.js "$file" "$OUTPUT_DIR/$device/boardview"
    
    echo "✓ Converted: $device"
  fi
done

echo "✅ All files converted"
```

## Finding BoardView Files

### Search Strategy

1. **GitHub Search**
   ```
   site:github.com iPhone boardview .brd
   site:github.com Samsung boardview files
   site:github.com phone schematic boardview
   ```

2. **Community Forums**
   - badcaps.net
   - eevblog.com
   - reddit.com/r/mobilerepair
   - GSM-Forum

3. **Repair Sites**
   - alisaler.com
   - alifixit.com
   - gadget-manual.com
   - laptopschematic.com

4. **Direct Requests**
   - Contact repair shops
   - Ask in repair communities
   - Request from manufacturers (unlikely)

### Legal Considerations

⚠️ **Important**: BoardView files may be proprietary

- ✅ Files explicitly marked as free/open
- ✅ Files from open-source projects
- ✅ User-created files
- ✅ Files with permissive licenses
- ❌ Leaked manufacturer files
- ❌ Files from paid services
- ❌ Copyrighted materials

Always:
1. Check license/terms
2. Attribute sources
3. Respect copyrights
4. Remove if requested

## Implementation Roadmap

### Week 1-2: Research & Setup
- [ ] Set up OpenBoardView locally
- [ ] Test parsing various file formats
- [ ] Design JSON schema
- [ ] Create conversion scripts

### Week 3-4: File Collection
- [ ] Search for iPhone boardviews
- [ ] Search for Samsung boardviews
- [ ] Download and organize files
- [ ] Verify file quality

### Week 5-6: Conversion
- [ ] Convert all files to JSON
- [ ] Generate SVG layers
- [ ] Create preview images
- [ ] Organize in repository

### Week 7-8: Web Viewer
- [ ] Build JavaScript viewer
- [ ] Implement zoom/pan
- [ ] Add component search
- [ ] Add net highlighting

### Week 9-10: Mobile App
- [ ] Integrate Flutter viewer
- [ ] Add offline support
- [ ] Implement search
- [ ] Test on devices

### Week 11-12: Contribution System
- [ ] Build upload portal
- [ ] Implement processing pipeline
- [ ] Add review system
- [ ] Launch beta

## Example: iPhone 11 BoardView

```json
{
  "version": "1.0",
  "device": {
    "manufacturer": "Apple",
    "model": "iPhone 11",
    "boardNumber": "820-01523",
    "revision": "A"
  },
  "board": {
    "width": 120.5,
    "height": 65.2,
    "outline": [[0,0], [120.5,0], [120.5,65.2], [0,65.2]]
  },
  "components": [
    {
      "ref": "U3200",
      "type": "IC",
      "value": "A13 Bionic",
      "package": "BGA",
      "x": 60.2,
      "y": 32.5,
      "rotation": 0,
      "side": "top",
      "pins": ["1", "2", "3", "..."]
    },
    {
      "ref": "C3201",
      "type": "capacitor",
      "value": "10uF",
      "package": "0402",
      "x": 58.5,
      "y": 30.1,
      "rotation": 90,
      "side": "top",
      "pins": ["1", "2"]
    }
  ],
  "nets": [
    {
      "name": "PP_VDD_MAIN",
      "pins": ["U3200.A5", "C3201.1", "C3202.1"]
    }
  ]
}
```

## Resources

### Tools
- [OpenBoardView](https://github.com/OpenBoardView/OpenBoardView) - Open source viewer
- [boardview-tools](https://github.com/nitrocaster/boardview-tools) - Conversion tools
- [bv2bvr](https://github.com/inflex/bv2bvr) - Format converter

### File Sources
- [alisaler.com](https://www.alisaler.com/category-laptop-boardview/) - Laptop boardviews
- [gadget-manual.com](https://www.gadget-manual.com/boardview/) - Phone boardviews
- [GitHub Gist](https://gist.github.com/vyach-vasiliev/35d610e14c40b4060f5d929ac70746a3) - Boardview software list

### Documentation
- [OpenBoardView Wiki](https://github.com/OpenBoardView/OpenBoardView/wiki)
- [BoardView Format Specs](https://github.com/OpenBoardView/OpenBoardView/tree/master/src/openboardview/FileFormats)

## Next Steps

1. Install OpenBoardView and test with sample files
2. Search for iPhone/Samsung boardview files
3. Create conversion pipeline
4. Build web viewer prototype
5. Integrate into RepairAI app

