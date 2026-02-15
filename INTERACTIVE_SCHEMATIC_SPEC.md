# Interactive Schematic Viewer Specification

## Overview

This document specifies the interactive schematic viewer feature for RepairAI, inspired by DZKJ, KiCanvas, and InteractivePCB viewers.

## Features

### Core Viewer Features

1. **Multi-Layer Support**
   - Top layer view
   - Bottom layer view
   - Internal layers (for multi-layer PCBs)
   - Silkscreen layers
   - Solder mask layers
   - Component placement layers

2. **Interactive Controls**
   - Zoom in/out (pinch, scroll, buttons)
   - Pan (drag, touch)
   - Rotate/flip board
   - Layer toggle (show/hide individual layers)
   - Component highlighting
   - Net highlighting (trace connections)

3. **Component Information**
   - Click component to see details
   - Part number
   - Value (resistance, capacitance, etc.)
   - Footprint
   - Datasheet link
   - Replacement parts

4. **Search & Navigation**
   - Search by component reference (R1, C5, U3, etc.)
   - Search by value
   - Search by part number
   - Jump to component
   - Highlight search results

5. **Measurement Tools**
   - Distance measurement
   - Area measurement
   - Coordinate display
   - Grid overlay

### Data Format

#### Schematic JSON Format

```json
{
  "version": "1.0",
  "device": {
    "manufacturer": "Samsung",
    "model": "A310F",
    "name": "Galaxy A3 2016"
  },
  "board": {
    "width": 120.5,
    "height": 65.2,
    "thickness": 0.8,
    "layers": 6,
    "units": "mm"
  },
  "layers": [
    {
      "id": "top",
      "name": "Top Layer",
      "type": "copper",
      "image": "layers/top.svg",
      "visible": true,
      "opacity": 1.0
    },
    {
      "id": "silkscreen_top",
      "name": "Top Silkscreen",
      "type": "silkscreen",
      "image": "layers/silkscreen_top.svg",
      "visible": true,
      "opacity": 0.8
    },
    {
      "id": "bottom",
      "name": "Bottom Layer",
      "type": "copper",
      "image": "layers/bottom.svg",
      "visible": false,
      "opacity": 1.0
    }
  ],
  "components": [
    {
      "ref": "U1",
      "type": "IC",
      "value": "Exynos 7578",
      "package": "BGA-256",
      "x": 45.2,
      "y": 32.1,
      "rotation": 0,
      "layer": "top",
      "pins": 256,
      "description": "Main processor",
      "datasheet": "https://example.com/datasheet.pdf",
      "replacements": ["Exynos 7578A", "Exynos 7578B"]
    },
    {
      "ref": "C1",
      "type": "capacitor",
      "value": "10uF",
      "package": "0402",
      "x": 12.5,
      "y": 8.3,
      "rotation": 90,
      "layer": "top",
      "voltage": "6.3V",
      "tolerance": "10%"
    }
  ],
  "nets": [
    {
      "id": "VCC_3V3",
      "name": "VCC_3V3",
      "components": ["U1.1", "U1.5", "C1.1", "C2.1"],
      "traces": [
        {
          "layer": "top",
          "width": 0.3,
          "points": [[45.2, 32.1], [45.5, 32.1], [45.5, 30.0]]
        }
      ]
    }
  ],
  "testPoints": [
    {
      "ref": "TP1",
      "net": "VCC_3V3",
      "x": 50.0,
      "y": 25.0,
      "layer": "top",
      "description": "3.3V power rail"
    }
  ]
}
```

### File Structure

```
repairai-files/
├── samsung/
│   ├── a310f/
│   │   ├── schematic/
│   │   │   ├── schematic.json       # Main schematic data
│   │   │   ├── layers/
│   │   │   │   ├── top.svg          # Top copper layer
│   │   │   │   ├── bottom.svg       # Bottom copper layer
│   │   │   │   ├── silkscreen_top.svg
│   │   │   │   ├── silkscreen_bottom.svg
│   │   │   │   ├── soldermask_top.svg
│   │   │   │   └── soldermask_bottom.svg
│   │   │   ├── components/
│   │   │   │   ├── u1.json          # Component details
│   │   │   │   └── ...
│   │   │   └── preview.png          # Thumbnail
│   │   └── ...
│   └── ...
└── ...
```

## Implementation

### Flutter App (Mobile)

#### Dependencies

```yaml
dependencies:
  flutter_svg: ^2.0.0          # SVG rendering
  photo_view: ^0.14.0          # Zoom/pan
  vector_math: ^2.1.4          # Transformations
  flutter_riverpod: ^2.4.0     # State management
```

#### Widget Structure

```dart
SchematicViewerPage
├── SchematicCanvas (CustomPaint)
│   ├── LayerRenderer
│   ├── ComponentRenderer
│   └── NetRenderer
├── LayerControlPanel
├── ComponentInfoPanel
└── ToolBar
    ├── ZoomControls
    ├── LayerToggle
    ├── SearchButton
    └── MeasurementTools
```

### Web Viewer (JavaScript)

#### Technology Stack

- **Canvas API** for rendering
- **WebGL** for hardware acceleration (optional)
- **SVG** for layer images
- **TypeScript** for type safety

#### Core Classes

```typescript
class SchematicViewer {
  canvas: HTMLCanvasElement;
  layers: Layer[];
  components: Component[];
  viewport: Viewport;
  
  render(): void;
  zoomIn(): void;
  zoomOut(): void;
  pan(dx: number, dy: number): void;
  toggleLayer(layerId: string): void;
  highlightComponent(ref: string): void;
  searchComponent(query: string): Component[];
}

class Layer {
  id: string;
  name: string;
  image: SVGElement;
  visible: boolean;
  opacity: number;
  
  render(ctx: CanvasRenderingContext2D): void;
}

class Component {
  ref: string;
  type: string;
  position: Point;
  bounds: Rectangle;
  
  isPointInside(point: Point): boolean;
  getInfo(): ComponentInfo;
}
```

## User Contribution System

### Contribution Workflow

1. **User uploads schematic files**
   - SVG/PNG layer images
   - Component list (CSV/JSON)
   - Board dimensions

2. **AI-assisted processing**
   - Extract component positions from images
   - OCR for component references
   - Generate schematic.json

3. **Manual review & editing**
   - Web-based editor
   - Verify component positions
   - Add missing information
   - Test interactive viewer

4. **Submission & approval**
   - Submit to repository
   - Community review
   - Moderator approval
   - Merge to main repository

### Contribution Portal

#### Web Interface

```
repairai-website/
├── app/
│   ├── contribute/
│   │   ├── page.tsx              # Contribution landing
│   │   ├── upload/
│   │   │   └── page.tsx          # File upload
│   │   ├── editor/
│   │   │   └── page.tsx          # Schematic editor
│   │   └── review/
│   │       └── page.tsx          # Review submissions
│   └── ...
└── ...
```

#### Upload Form

```typescript
interface SchematicUpload {
  device: {
    manufacturer: string;
    model: string;
    name: string;
  };
  files: {
    layers: File[];           // SVG/PNG files
    componentList?: File;     // CSV/JSON
    boardImage?: File;        // Reference photo
  };
  metadata: {
    boardDimensions: {
      width: number;
      height: number;
      units: 'mm' | 'inch';
    };
    layerCount: number;
    source: string;           // Where did you get this?
    license: string;          // License information
  };
  contributor: {
    name: string;
    email: string;
    github?: string;
  };
}
```

### AI Processing Pipeline

1. **Image Analysis**
   - Detect board outline
   - Extract component positions
   - OCR component references
   - Identify component types

2. **Data Extraction**
   - Parse component list
   - Match components to positions
   - Extract net connections
   - Generate JSON structure

3. **Validation**
   - Check data completeness
   - Verify component positions
   - Validate JSON schema
   - Generate preview

### Editor Features

1. **Visual Editor**
   - Drag components to adjust position
   - Add/edit component information
   - Draw/edit net connections
   - Add test points

2. **Component Database**
   - Search common components
   - Auto-fill component data
   - Link to datasheets
   - Suggest replacements

3. **Preview & Test**
   - Live preview of interactive viewer
   - Test all features
   - Verify layer visibility
   - Check component highlighting

## API Endpoints

### Schematic Data API

```
GET /api/schematics/:manufacturer/:model
Response: SchematicData

GET /api/schematics/:manufacturer/:model/layers/:layerId
Response: SVG/PNG image

GET /api/schematics/:manufacturer/:model/components/:ref
Response: ComponentInfo

POST /api/schematics/contribute
Body: SchematicUpload
Response: SubmissionId

GET /api/schematics/submissions/:id
Response: SubmissionStatus

PUT /api/schematics/submissions/:id
Body: SchematicData (edited)
Response: Success

POST /api/schematics/submissions/:id/approve
Response: Success
```

## Mobile App Integration

### Schematic Viewer Widget

```dart
class InteractiveSchematicViewer extends StatefulWidget {
  final String manufacturer;
  final String model;
  
  @override
  State<InteractiveSchematicViewer> createState() => 
      _InteractiveSchematicViewerState();
}

class _InteractiveSchematicViewerState 
    extends State<InteractiveSchematicViewer> {
  SchematicData? _schematic;
  TransformationController _transformController;
  Set<String> _visibleLayers;
  String? _selectedComponent;
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Main canvas
        InteractiveViewer(
          transformationController: _transformController,
          child: CustomPaint(
            painter: SchematicPainter(
              schematic: _schematic,
              visibleLayers: _visibleLayers,
              selectedComponent: _selectedComponent,
            ),
          ),
        ),
        
        // Layer controls
        Positioned(
          right: 16,
          top: 16,
          child: LayerControlPanel(
            layers: _schematic?.layers ?? [],
            visibleLayers: _visibleLayers,
            onToggle: _toggleLayer,
          ),
        ),
        
        // Component info
        if (_selectedComponent != null)
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: ComponentInfoCard(
              component: _getComponent(_selectedComponent!),
            ),
          ),
        
        // Toolbar
        Positioned(
          left: 16,
          top: 16,
          child: SchematicToolbar(
            onZoomIn: _zoomIn,
            onZoomOut: _zoomOut,
            onReset: _resetView,
            onSearch: _showSearch,
          ),
        ),
      ],
    );
  }
}
```

## Performance Considerations

1. **Layer Caching**
   - Cache rendered layers
   - Only re-render on changes
   - Use hardware acceleration

2. **Progressive Loading**
   - Load preview first
   - Load layers on demand
   - Lazy load component details

3. **Optimization**
   - Use SVG for scalability
   - Compress images
   - Minimize JSON size
   - Use CDN for assets

## Security & Privacy

1. **Contribution Moderation**
   - All submissions reviewed
   - Check for malicious content
   - Verify licensing
   - Scan for personal information

2. **Data Validation**
   - Validate JSON schema
   - Sanitize user input
   - Check file types
   - Limit file sizes

3. **Attribution**
   - Track contributors
   - Maintain source information
   - Respect licenses
   - Credit original sources

## Future Enhancements

- [ ] 3D PCB visualization
- [ ] Animated assembly guides
- [ ] AR overlay for real boards
- [ ] Collaborative editing
- [ ] Version control for schematics
- [ ] Export to various formats
- [ ] Integration with repair guides
- [ ] Community ratings & comments

## References

- [KiCanvas](https://github.com/theacodes/kicanvas) - KiCad web viewer
- [InteractivePCB](https://github.com/oceanofthelost/InteractivePCB) - Interactive PCB viewer
- [DZKJ Schematics](https://www.dzkj16888.com/) - Commercial schematic tool
- [Altium 365 Viewer](https://www.altium.com/viewer/) - Professional PCB viewer

