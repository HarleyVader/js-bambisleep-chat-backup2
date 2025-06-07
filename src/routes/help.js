import express from 'express';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import footerConfig from '../config/footer.config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DOCS_DIR = join(__dirname, '..', 'public', 'docs');

/**
 * Get all documentation files
 */
async function getDocumentationFiles() {
  try {
    const files = await readdir(PUBLIC_DOCS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    return mdFiles.map(file => ({
      name: file,
      title: file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      path: `/docs/${file.replace('.md', '')}` // Point to docs system instead
    }));
  } catch (error) {
    console.error('Error reading documentation files:', error);
    return [];
  }
}

// Help home page
router.get('/', async (req, res) => {
  const docs = await getDocumentationFiles();
  res.render('help', { 
    title: 'Help Center',
    footer: footerConfig,
    validConstantsCount: 5,
    docs: docs
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