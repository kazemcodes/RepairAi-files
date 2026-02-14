/**
 * Integrate Command
 * Reviews and integrates staged data into main repository
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../utils/config.js';
import AIService from '../services/ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Required files for a device
 */
const REQUIRED_FILES = [
  'screws.md',
  'cover.md',
  'board.md',
  'parts.md',
  'solution.md',
  'steps.md'
];

/**
 * Validate staged data structure
 * @param {string} stagedDir - Path to staged data
 * @returns {object} Validation result
 */
function validateStagedData(stagedDir) {
  const issues = [];
  const found = [];
  
  // Check for required files
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(stagedDir, file);
    if (fs.existsSync(filePath)) {
      found.push(file);
    } else {
      issues.push(`Missing required file: ${file}`);
    }
  }
  
  // Check for steps directory
  const stepsDir = path.join(stagedDir, 'steps');
  if (fs.existsSync(stepsDir)) {
    found.push('steps/');
  } else {
    issues.push('Missing steps/ directory');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    found
  };
}

/**
 * Read existing data from repository
 * @param {string} repoPath - Repository path
 * @param {string} manufacturer - Manufacturer
 * @param {string} model - Model
 * @returns {object} Existing data
 */
function readExistingData(repoPath, manufacturer, model) {
  const devicePath = path.join(repoPath, manufacturer.toLowerCase(), model.toLowerCase());
  const data = {};
  
  if (!fs.existsSync(devicePath)) {
    return null;
  }
  
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(devicePath, file);
    if (fs.existsSync(filePath)) {
      data[file] = fs.readFileSync(filePath, 'utf-8');
    }
  }
  
  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Backup existing data
 * @param {string} repoPath - Repository path
 * @param {string} manufacturer - Manufacturer
 * @param {string} model - Model
 * @returns {string} Backup path
 */
function backupExistingData(repoPath, manufacturer, model) {
  const devicePath = path.join(repoPath, manufacturer.toLowerCase(), model.toLowerCase());
  
  if (!fs.existsSync(devicePath)) {
    return null;
  }
  
  const backupDir = path.join(repoPath, '..', 'repairai-scraper-backups', 
    `${manufacturer.toLowerCase()}-${model.toLowerCase()}-${Date.now()}`);
  
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Copy files to backup
  const copyRecursive = (src, dest) => {
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const item of fs.readdirSync(src)) {
        copyRecursive(path.join(src, item), path.join(dest, item));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  };
  
  copyRecursive(devicePath, backupDir);
  
  return backupDir;
}

/**
 * Main integrate command
 * @param {object} options - Command options
 */
export async function integrateCommand(options) {
  const { source, manufacturer, model: modelName, approve, backup: createBackup } = options;
  
  console.log('\n🔄 RepairAi Integrator');
  console.log('='.repeat(40));
  console.log(`Source: ${source}`);
  console.log(`Manufacturer: ${manufacturer}`);
  console.log(`Model: ${modelName}`);
  console.log(`Auto-approve: ${approve}`);
  console.log(`Backup: ${createBackup}`);
  console.log('');
  
  // Check source exists
  if (!fs.existsSync(source)) {
    console.error(`❌ Source directory not found: ${source}`);
    process.exit(1);
  }
  
  // Validate staged data
  console.log('🔍 Validating staged data...');
  const validation = validateStagedData(source);
  
  if (!validation.valid) {
    console.log('⚠️  Validation issues found:');
    for (const issue of validation.issues) {
      console.log(`   • ${issue}`);
    }
    console.log('');
  }
  
  console.log(`Found ${validation.found.length} file(s):`);
  for (const file of validation.found) {
    console.log(`   • ${file}`);
  }
  console.log('');
  
  // Load config
  const cfg = config.load();
  const repoPath = path.resolve(cfg.directories.repo_root);
  
  // Read new content
  const newContent = {};
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(source, file);
    if (fs.existsSync(filePath)) {
      newContent[file] = fs.readFileSync(filePath, 'utf-8');
    }
  }
  
  // Read existing content if available
  let existingContent = null;
  if (manufacturer && modelName) {
    existingContent = readExistingData(repoPath, manufacturer, modelName);
    if (existingContent) {
      console.log('📋 Found existing data in repository');
    }
  }
  
  // Validate with AI if API key available
  let validationResult = null;
  if (process.env.OPENROUTER_API_KEY && (manufacturer && modelName)) {
    console.log('🤖 Running AI validation...');
    
    try {
      const aiService = new AIService();
      const combinedContent = Object.entries(newContent)
        .map(([file, content]) => `## ${file}\n${content}`)
        .join('\n\n');
      
      const existingDataStr = existingContent 
        ? Object.entries(existingContent).map(([file, content]) => `## ${file}\n${content}`).join('\n\n')
        : null;
      
      validationResult = await aiService.validateContent(
        { raw: combinedContent },
        existingDataStr
      );
      
      console.log(`   Score: ${validationResult.score}/100`);
      console.log(`   Recommendation: ${validationResult.recommendation}`);
      console.log('');
    } catch (error) {
      console.warn(`   ⚠️  AI validation failed: ${error.message}`);
    }
  }
  
  // Check if should proceed
  let shouldProceed = approve;
  
  if (!shouldProceed && validationResult) {
    if (validationResult.recommendation === 'approve') {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question(`AI recommends: ${validationResult.recommendation}. Proceed? [y/N] `, resolve);
      });
      
      rl.close();
      shouldProceed = answer.toLowerCase() === 'y';
    } else {
      console.log(`⚠️  AI recommends: ${validationResult.recommendation}`);
      console.log('   Data requires manual review before integration');
      shouldProceed = false;
    }
  }
  
  if (!shouldProceed) {
    console.log('❌ Integration cancelled');
    console.log('   Data is in staging for manual review');
    return;
  }
  
  // Create backup if exists
  let backupPath = null;
  if (createBackup && existingContent) {
    console.log('📦 Creating backup...');
    backupPath = backupExistingData(repoPath, manufacturer, modelName);
    console.log(`   Backup saved to: ${backupPath}`);
  }
  
  // Integrate data
  if (!manufacturer || !modelName) {
    console.log('⚠️  Manufacturer and model not specified');
    console.log('   Moving staged data to repository root for manual integration');
    
    const targetDir = path.join(repoPath, 'staging-pending');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const destPath = path.join(targetDir, path.basename(source));
    fs.renameSync(source, destPath);
    
    console.log(`\n✅ Data moved to: ${destPath}`);
    console.log('   Please manually integrate into correct location');
    return;
  }
  
  // Copy files to repository
  const devicePath = path.join(repoPath, manufacturer.toLowerCase(), modelName.toLowerCase());
  
  if (!fs.existsSync(devicePath)) {
    fs.mkdirSync(devicePath, { recursive: true });
  }
  
  // Copy each file
  for (const file of REQUIRED_FILES) {
    const srcPath = path.join(source, file);
    const destPath = path.join(devicePath, file);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`   Copied: ${file}`);
    }
  }
  
  // Copy steps directory if exists
  const srcStepsDir = path.join(source, 'steps');
  const destStepsDir = path.join(devicePath, 'steps');
  
  if (fs.existsSync(srcStepsDir)) {
    fs.mkdirSync(destStepsDir, { recursive: true });
    
    for (const file of fs.readdirSync(srcStepsDir)) {
      fs.copyFileSync(path.join(srcStepsDir, file), path.join(destStepsDir, file));
      console.log(`   Copied: steps/${file}`);
    }
  }
  
  console.log(`\n✅ Data integrated to: ${devicePath}`);
  console.log('   Run "repair-ai-scraper index" to update the index');
}

export default integrateCommand;
