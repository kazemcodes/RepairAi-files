/**
 * BoardView File Converter
 * Converts .brd/.bv/.bdv/.asc/.fz files to web-friendly JSON format
 * Uses OpenBoardView-based parsers
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { parseFile } = require('../parsers');

/**
 * Convert boardview files to JSON
 * @param {Object} options - Command options
 */
async function boardviewConvert(options = {}) {
  const {
    input,
    output,
    format = 'json',
    generatePreview = false,
    generateSVG = true,
    fzkey = null
  } = options;

  console.log('🔄 Converting BoardView files...');
  console.log(`Input: ${input}`);
  console.log(`Output: ${output}`);

  // Check if input exists
  try {
    await fs.access(input);
  } catch (error) {
    console.error(`❌ Input file/directory not found: ${input}`);
    return;
  }

  // Create output directory
  await fs.mkdir(output, { recursive: true });

  // Get list of files to convert
  const files = await getFilesToConvert(input);
  
  if (files.length === 0) {
    console.log('⚠️  No boardview files found');
    return;
  }

  console.log(`\n📁 Found ${files.length} file(s) to convert`);

  // Convert each file
  const results = [];
  for (const file of files) {
    try {
      console.log(`\n🔄 Converting: ${path.basename(file)}`);
      const result = await convertFile(file, output, {
        format,
        generatePreview,
        generateSVG,
        fzkey
      });
      results.push(result);
      console.log(`✅ Converted: ${path.basename(file)}`);
    } catch (error) {
      console.error(`❌ Failed to convert ${path.basename(file)}:`, error.message);
      results.push({ file, error: error.message });
    }
  }

  // Generate summary
  const successful = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;

  console.log('\n📊 Conversion Summary:');
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📁 Output: ${output}`);

  return results;
}

/**
 * Get files to convert
 */
async function getFilesToConvert(input) {
  const stat = await fs.stat(input);
  
  if (stat.isFile()) {
    return [input];
  }
  
  // Directory - find all boardview files
  const files = await fs.readdir(input);
  const boardviewFiles = files.filter(f => 
    /\.(brd|bv|bdv|asc|fz)$/i.test(f)
  );
  
  return boardviewFiles.map(f => path.join(input, f));
}

/**
 * Convert single file
 */
async function convertFile(inputFile, outputDir, options) {
  const basename = path.basename(inputFile, path.extname(inputFile));
  const fileOutputDir = path.join(outputDir, basename);
  
  await fs.mkdir(fileOutputDir, { recursive: true });

  console.log('   📖 Parsing boardview file...');
  
  // Read file as buffer
  const buffer = fsSync.readFileSync(inputFile);
  
  // Parse with our OpenBoardView-based parsers
  const boardData = parseFile(buffer, inputFile, { fzkey: options.fzkey });
  
  console.log(`   ✓ Format: ${boardData.format}`);
  console.log(`   ✓ Parts: ${boardData.board.parts.length}`);
  console.log(`   ✓ Pins: ${boardData.board.pins.length}`);
  console.log(`   ✓ Nails: ${boardData.board.nails.length}`);
  console.log(`   ✓ Nets: ${boardData.board.nets.length}`);
  console.log(`   ✓ Outline points: ${boardData.board.outline.length}`);

  // Generate JSON
  const jsonFile = path.join(fileOutputDir, 'boardview.json');
  await fs.writeFile(jsonFile, JSON.stringify(boardData, null, 2), 'utf8');

  // Generate SVG layers
  if (options.generateSVG) {
    await generateSVGLayers(boardData, fileOutputDir);
  }

  // Copy original file
  const originalFile = path.join(fileOutputDir, 'original' + path.extname(inputFile));
  await fs.copyFile(inputFile, originalFile);

  return {
    file: inputFile,
    output: fileOutputDir,
    json: jsonFile,
    format: boardData.format,
    parts: boardData.board.parts.length,
    pins: boardData.board.pins.length,
    nails: boardData.board.nails.length,
    nets: boardData.board.nets.length
  };
}

/**
 * Generate SVG layers
 */
async function generateSVGLayers(boardData, outputDir) {
  console.log('   🎨 Generating SVG layers...');
  
  const layersDir = path.join(outputDir, 'layers');
  await fs.mkdir(layersDir, { recursive: true });
  
  const { board } = boardData;
  
  // Calculate bounds
  const allPoints = [
    ...board.outline,
    ...board.pins.map(p => ({ x: p.x, y: p.y })),
    ...board.nails.map(n => ({ x: n.x, y: n.y }))
  ];

  if (allPoints.length === 0) {
    console.log('   ⚠️  No points to render');
    return;
  }

  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  const width = maxX - minX;
  const height = maxY - minY;
  const padding = 100;

  // Generate combined view
  const combinedSvg = generateSVG(boardData, {
    minX, maxX, minY, maxY, width, height, padding,
    showTop: true,
    showBottom: true,
    showNails: true
  });
  await fs.writeFile(path.join(layersDir, 'combined.svg'), combinedSvg, 'utf8');

  // Generate top layer
  const topSvg = generateSVG(boardData, {
    minX, maxX, minY, maxY, width, height, padding,
    showTop: true,
    showBottom: false,
    showNails: true
  });
  await fs.writeFile(path.join(layersDir, 'top.svg'), topSvg, 'utf8');

  // Generate bottom layer
  const bottomSvg = generateSVG(boardData, {
    minX, maxX, minY, maxY, width, height, padding,
    showTop: false,
    showBottom: true,
    showNails: true
  });
  await fs.writeFile(path.join(layersDir, 'bottom.svg'), bottomSvg, 'utf8');

  console.log(`   ✓ Generated SVG layers in ${layersDir}`);
  
  return layersDir;
}

/**
 * Generate SVG from parsed boardview data
 */
function generateSVG(parsed, options) {
  const { board } = parsed;
  const { minX, maxX, minY, maxY, width, height, padding, showTop, showBottom, showNails } = options;

  // Start SVG
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width + padding * 2}" 
     height="${height + padding * 2}" 
     viewBox="${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}">
  <defs>
    <style>
      .outline { fill: none; stroke: #333; stroke-width: 2; }
      .pin-top { fill: #4CAF50; stroke: #2E7D32; stroke-width: 0.5; opacity: 0.8; }
      .pin-bottom { fill: #2196F3; stroke: #1565C0; stroke-width: 0.5; opacity: 0.8; }
      .pin-both { fill: #FF9800; stroke: #E65100; stroke-width: 0.5; opacity: 0.8; }
      .nail { fill: #F44336; stroke: #B71C1C; stroke-width: 0.5; opacity: 0.8; }
      .part-label { font-family: Arial; font-size: 12px; fill: #333; }
      .pin-label { font-family: Arial; font-size: 8px; fill: #666; }
    </style>
  </defs>
  
  <g id="board">
`;

  // Draw outline
  if (board.outline.length > 0) {
    svg += '    <path class="outline" d="';
    board.outline.forEach((point, i) => {
      svg += `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y} `;
    });
    svg += 'Z" />\n';
  }

  // Draw pins
  svg += '    <g id="pins">\n';
  board.pins.forEach((pin) => {
    const side = pin.side.toLowerCase();
    if ((side === 'top' && !showTop) || (side === 'bottom' && !showBottom)) {
      return;
    }
    const className = `pin-${side}`;
    const radius = pin.radius || 5;
    const net = (pin.net || '').replace(/"/g, '&quot;');
    svg += `      <circle class="${className}" cx="${pin.x}" cy="${pin.y}" r="${radius}" data-net="${net}" data-part="${pin.part}" />\n`;
  });
  svg += '    </g>\n';

  // Draw nails
  if (showNails && board.nails.length > 0) {
    svg += '    <g id="nails">\n';
    board.nails.forEach(nail => {
      const net = (nail.net || '').replace(/"/g, '&quot;');
      svg += `      <circle class="nail" cx="${nail.x}" cy="${nail.y}" r="3" data-net="${net}" />\n`;
    });
    svg += '    </g>\n';
  }

  // Draw part labels (sample - only first 50 to avoid clutter)
  svg += '    <g id="part-labels">\n';
  const partsToLabel = board.parts.slice(0, 50);
  partsToLabel.forEach((part, i) => {
    // Find first pin of this part
    const pin = board.pins.find(p => p.part === i + 1);
    if (pin) {
      const name = (part.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      svg += `      <text class="part-label" x="${pin.x}" y="${pin.y - 10}">${name}</text>\n`;
    }
  });
  svg += '    </g>\n';

  svg += '  </g>\n</svg>';

  return svg;
}

module.exports = boardviewConvert;
