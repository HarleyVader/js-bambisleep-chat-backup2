import express from 'express';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import footerConfig from '../config/footer.config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..');
const DOCS_DIR = join(ROOT_DIR, 'docs');

/**
 * Get all documentation files from the docs directory
 */
async function getDocumentationFiles() {
  try {
    const files = await readdir(DOCS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    return mdFiles.map(file => ({
      name: file,
      title: file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      path: `/docs/${file.replace('.md', '')}`,
      category: categorizeDoc(file)
    }));
  } catch (error) {
    console.error('Error reading documentation files:', error);
    return [];
  }
}

/**
 * Categorize documentation files
 */
function categorizeDoc(filename) {
  const name = filename.toLowerCase();
  if (name.includes('install') || name.includes('setup')) return 'Setup & Installation';
  if (name.includes('api') || name.includes('routes')) return 'API & Routes';
  if (name.includes('debug') || name.includes('troubleshoot')) return 'Debug & Troubleshooting';
  if (name.includes('user') || name.includes('guide')) return 'User Guides';
  if (name.includes('css') || name.includes('views')) return 'Development';
  return 'General';
}

// Help home page
router.get('/', async (req, res) => {
  const docs = await getDocumentationFiles();
  
  // Group docs by category
  const docsByCategory = docs.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {});
  
  res.render('help', { 
    title: 'BambiSleep.Chat Help Center',
    footer: footerConfig,
    validConstantsCount: 5,
    docs: docs,
    docsByCategory: docsByCategory,
    totalDocs: docs.length
  });
});

// Individual documentation pages - redirect to docs system
router.get('/:docName', async (req, res) => {
  const { docName } = req.params;
  // Redirect to the more advanced docs system
  res.redirect(301, `/docs/${docName}`);
});

// Export the router
export default router;