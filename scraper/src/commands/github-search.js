/**
 * GitHub Search Command
 * Searches GitHub for phone schematic repositories and downloads relevant files
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

/**
 * Search GitHub for schematic repositories
 * @param {Object} options - Command options
 */
async function githubSearch(options = {}) {
  const {
    query = 'phone schematics repair',
    manufacturer = null,
    model = null,
    outputDir = './data/github-schematics',
    limit = 10
  } = options;

  console.log('🔍 Searching GitHub for schematic repositories...');
  console.log(`Query: ${query}`);
  if (manufacturer) console.log(`Manufacturer: ${manufacturer}`);
  if (model) console.log(`Model: ${model}`);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Build search query
  let searchQuery = query;
  if (manufacturer) searchQuery += ` ${manufacturer}`;
  if (model) searchQuery += ` ${model}`;

  // Search terms to try
  const searchTerms = [
    `${searchQuery} schematic`,
    `${searchQuery} repair guide`,
    `${searchQuery} PCB diagram`,
    `${searchQuery} service manual`,
    manufacturer ? `${manufacturer} schematic diagram` : null,
  ].filter(Boolean);

  const results = [];

  for (const term of searchTerms) {
    console.log(`\n📡 Searching: "${term}"`);
    
    try {
      // Note: This is a placeholder for actual GitHub API search
      // In production, you would use GitHub's REST API or GraphQL API
      const searchResults = await searchGitHubAPI(term, limit);
      results.push(...searchResults);
      
      // Delay to respect rate limits
      await delay(1000);
    } catch (error) {
      console.error(`❌ Error searching "${term}":`, error.message);
    }
  }

  // Remove duplicates
  const uniqueResults = deduplicateResults(results);
  
  console.log(`\n✅ Found ${uniqueResults.length} unique repositories`);

  // Save results
  const resultsFile = path.join(outputDir, 'search-results.json');
  await fs.writeFile(
    resultsFile,
    JSON.stringify(uniqueResults, null, 2),
    'utf8'
  );
  console.log(`📝 Results saved to: ${resultsFile}`);

  // Display summary
  console.log('\n📊 Repository Summary:');
  uniqueResults.slice(0, 10).forEach((repo, index) => {
    console.log(`${index + 1}. ${repo.name}`);
    console.log(`   URL: ${repo.url}`);
    console.log(`   Stars: ${repo.stars} | Language: ${repo.language || 'N/A'}`);
    console.log(`   Description: ${repo.description || 'No description'}`);
    console.log('');
  });

  return uniqueResults;
}

/**
 * Search GitHub API (placeholder - needs actual implementation)
 * @param {string} query - Search query
 * @param {number} limit - Max results
 */
async function searchGitHubAPI(query, limit) {
  // This is a placeholder. In production, use:
  // - GitHub REST API: https://api.github.com/search/repositories
  // - Or GitHub GraphQL API
  // - Requires authentication token for higher rate limits
  
  console.log('⚠️  Note: GitHub API integration needed');
  console.log('   Please implement GitHub API search with authentication');
  
  // Return empty array for now
  return [];
}

/**
 * Download files from a GitHub repository
 * @param {Object} repo - Repository object
 * @param {string} outputDir - Output directory
 */
async function downloadRepoFiles(repo, outputDir) {
  console.log(`\n📥 Downloading files from: ${repo.name}`);
  
  const repoDir = path.join(outputDir, sanitizeFilename(repo.name));
  await fs.mkdir(repoDir, { recursive: true });

  // File patterns to look for
  const patterns = [
    /schematic/i,
    /diagram/i,
    /pcb/i,
    /repair/i,
    /service.*manual/i,
    /\.pdf$/i,
    /\.md$/i,
  ];

  try {
    // Get repository contents
    const contents = await getRepoContents(repo);
    
    // Filter relevant files
    const relevantFiles = contents.filter(file => 
      patterns.some(pattern => pattern.test(file.name) || pattern.test(file.path))
    );

    console.log(`   Found ${relevantFiles.length} relevant files`);

    // Download each file
    for (const file of relevantFiles) {
      try {
        await downloadFile(file.download_url, path.join(repoDir, file.name));
        console.log(`   ✓ Downloaded: ${file.name}`);
      } catch (error) {
        console.error(`   ✗ Failed to download ${file.name}:`, error.message);
      }
    }

    // Save metadata
    const metadataFile = path.join(repoDir, '_metadata.json');
    await fs.writeFile(
      metadataFile,
      JSON.stringify({
        repository: repo,
        downloadedAt: new Date().toISOString(),
        files: relevantFiles.map(f => f.name)
      }, null, 2),
      'utf8'
    );

    console.log(`   ✅ Download complete`);
  } catch (error) {
    console.error(`   ❌ Error downloading from ${repo.name}:`, error.message);
  }
}

/**
 * Get repository contents (placeholder)
 */
async function getRepoContents(repo) {
  // Placeholder - implement GitHub API call
  return [];
}

/**
 * Download a file from URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      require('fs').unlink(filepath, () => {});
      reject(err);
    });
  });
}

/**
 * Remove duplicate results
 */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(repo => {
    if (seen.has(repo.url)) return false;
    seen.add(repo.url);
    return true;
  });
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = githubSearch;
