/**
 * Index Command
 * Generates or updates index.json for RepairAi-files repository
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scan directory for markdown files
 * @param {string} dir - Directory to scan
 * @param {string} basePath - Base path for relative paths
 * @returns {Array} Array of file info
 */
function scanForFiles(dir, basePath) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(basePath, fullPath);
    
    if (item.isDirectory()) {
      // Skip hidden directories and non-data directories
      if (!item.name.startsWith('.') && item.name !== 'node_modules') {
        files.push(...scanForFiles(fullPath, basePath));
      }
    } else if (item.name.endsWith('.md')) {
      // Read markdown frontmatter
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data, content: body } = matter(content);
        
        // Extract first paragraph as description
        const paragraphs = body.split('\n\n').filter(p => p.trim());
        const description = paragraphs[0]?.substring(0, 200) || '';
        
        // Determine type from path
        const type = getFileType(relativePath);
        
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          type,
          title: data.title || getTitleFromPath(relativePath),
          description,
          ...data
        });
      } catch (e) {
        // If can't parse, just add basic info
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          type: getFileType(relativePath),
          title: getTitleFromPath(relativePath)
        });
      }
    }
  }
  
  return files;
}

/**
 * Determine file type from path
 * @param {string} filePath - File path
 * @returns {string} File type
 */
function getFileType(filePath) {
  const lower = filePath.toLowerCase();
  
  if (lower.includes('screws')) return 'screw';
  if (lower.includes('cover')) return 'cover';
  if (lower.includes('board')) return 'board';
  if (lower.includes('parts')) return 'parts';
  if (lower.includes('solution')) return 'solution';
  if (lower.includes('steps/step')) return 'step';
  if (lower.includes('steps')) return 'steps';
  if (lower.includes('schematic') || lower.includes('diagram')) return 'schematic';
  
  return 'general';
}

/**
 * Get title from file path
 * @param {string} filePath - File path
 * @returns {string} Title
 */
function getTitleFromPath(filePath) {
  const basename = path.basename(filePath, '.md');
  const parts = basename.split(/[-_]/);
  
  // Capitalize words
  return parts.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Generate markdown index
 * @param {Array} files - File list
 * @returns {string} Markdown content
 */
function generateMarkdownIndex(files) {
  let md = '# RepairAi Files Index\n\n';
  md += `Last updated: ${new Date().toISOString()}\n\n`;
  md += `Total files: ${files.length}\n\n`;
  md += '---\n\n';
  
  // Group by manufacturer
  const manufacturers = {};
  
  for (const file of files) {
    const parts = file.path.split('/');
    if (parts.length >= 2) {
      const manufacturer = parts[0];
      if (!manufacturers[manufacturer]) {
        manufacturers[manufacturer] = [];
      }
      manufacturers[manufacturer].push(file);
    }
  }
  
  // Generate by manufacturer
  for (const [manufacturer, deviceFiles] of Object.entries(manufacturers)) {
    md += `## ${capitalize(manufacturer)}\n\n`;
    
    // Group by model
    const models = {};
    for (const file of deviceFiles) {
      const parts = file.path.split('/');
      if (parts.length >= 2) {
        const model = parts[1];
        if (!models[model]) {
          models[model] = [];
        }
        models[model].push(file);
      }
    }
    
    for (const [model, modelFiles] of Object.entries(models)) {
      md += `### ${capitalize(model.replace(/-/g, ' '))}\n\n`;
      
      for (const file of modelFiles) {
        md += `- [${file.title}](${file.path}) - ${file.type}\n`;
      }
      
      md += '\n';
    }
  }
  
  return md;
}

/**
 * Capitalize first letter
 * @param {string} str - String
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Main index command
 * @param {object} options - Command options
 */
export async function indexCommand(options) {
  const { repo, format } = options;
  
  console.log('\n📑 RepairAi Index Generator');
  console.log('='.repeat(40));
  console.log(`Repository: ${repo}`);
  console.log(`Format: ${format}`);
  console.log('');
  
  // Check repository exists
  const repoPath = path.resolve(repo);
  
  if (!fs.existsSync(repoPath)) {
    console.error(`❌ Repository not found: ${repo}`);
    process.exit(1);
  }
  
  console.log('🔍 Scanning repository...');
  
  // Scan for markdown files
  const files = scanForFiles(repoPath, repoPath);
  
  console.log(`Found ${files.length} markdown file(s)`);
  console.log('');
  
  // Generate index
  let indexContent;
  let indexPath;
  
  if (format === 'json') {
    const indexData = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalFiles: files.length,
      files
    };
    
    indexContent = JSON.stringify(indexData, null, 2);
    indexPath = path.join(repoPath, 'index.json');
  } else {
    indexContent = generateMarkdownIndex(files);
    indexPath = path.join(repoPath, 'index.md');
  }
  
  // Check if index exists and compare
  let needsUpdate = true;
  if (fs.existsSync(indexPath)) {
    const existing = fs.readFileSync(indexPath, 'utf-8');
    if (existing === indexContent) {
      console.log('ℹ️  Index unchanged - no update needed');
      needsUpdate = false;
    }
  }
  
  if (needsUpdate) {
    // Create backup
    if (fs.existsSync(indexPath)) {
      const backupPath = `${indexPath}.bak`;
      fs.copyFileSync(indexPath, backupPath);
      console.log(`📦 Backup created: ${path.basename(backupPath)}`);
    }
    
    // Write new index
    fs.writeFileSync(indexPath, indexContent, 'utf-8');
    console.log(`✅ Index saved to: ${indexPath}`);
  }
  
  // Summary by type
  console.log('\n📊 Files by type:');
  const types = {};
  for (const file of files) {
    types[file.type] = (types[file.type] || 0) + 1;
  }
  
  for (const [type, count] of Object.entries(types)) {
    console.log(`   ${type}: ${count}`);
  }
  
  console.log('\n✅ Index generation completed!');
}

export default indexCommand;
