/**
 * Analyze Images Command
 * Analyzes downloaded images with Gemini AI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AIService from '../services/ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all image files in a directory
 * @param {string} dir - Directory path
 * @returns {Array} Array of image file paths
 */
function getImageFiles(dir) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const ext = path.extname(item).toLowerCase();
    if (imageExtensions.includes(ext)) {
      files.push(path.join(dir, item));
    }
  }
  
  return files;
}

/**
 * Main analyze-images command
 * @param {object} options - Command options
 */
export async function analyzeImagesCommand(options) {
  const { folder, prompt, model } = options;
  
  console.log('\n🖼️  RepairAi Image Analyzer');
  console.log('='.repeat(40));
  console.log(`Folder: ${folder}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Model: ${model}`);
  console.log('');
  
  // Check folder exists
  if (!fs.existsSync(folder)) {
    console.error(`❌ Folder not found: ${folder}`);
    process.exit(1);
  }
  
  // Get image files
  const imageFiles = getImageFiles(folder);
  
  if (imageFiles.length === 0) {
    console.log('❌ No image files found in folder');
    process.exit(1);
  }
  
  console.log(`Found ${imageFiles.length} image(s) to analyze`);
  console.log('');
  
  // Initialize AI service
  const aiService = new AIService();
  
  const results = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const filename = path.basename(imagePath);
    
    console.log(`📷 Analyzing: ${filename} (${i + 1}/${imageFiles.length})`);
    
    try {
      const result = await aiService.analyzeImage(imagePath, prompt);
      
      if (result.success) {
        results.push({
          file: filename,
          success: true,
          analysis: result.content
        });
        
        // Save analysis to file
        const analysisPath = path.join(folder, `${path.parse(filename).name}-analysis.txt`);
        fs.writeFileSync(analysisPath, result.content, 'utf-8');
        console.log(`   ✅ Analysis saved: ${path.basename(analysisPath)}`);
      } else {
        results.push({
          file: filename,
          success: false,
          error: result.error
        });
        console.log(`   ❌ Error: ${result.error}`);
      }
    } catch (error) {
      results.push({
        file: filename,
        success: false,
        error: error.message
      });
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success).length;
  console.log(`   Successful: ${successful}/${results.length}`);
  
  if (successful > 0) {
    console.log('\n✅ Image analysis completed!');
  } else {
    console.log('\n❌ No images analyzed successfully');
    process.exit(1);
  }
}

export default analyzeImagesCommand;
