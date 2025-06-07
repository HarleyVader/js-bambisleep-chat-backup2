import express from 'express';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import footerConfig from '../config/footer.config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DOCS_DIR = join(__dirname, '..', 'public', 'docs');

// Configure marked for GitHub-style rendering
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false,
  smartLists: true,
  smartypants: true,
});

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
      path: `/help/${file.replace('.md', '')}`
    }));
  } catch (error) {
    console.error('Error reading documentation files:', error);
    return [];
  }
}

/**
 * Read and parse markdown file
 */
async function readMarkdownFile(fileName) {
  try {
    const filePath = join(PUBLIC_DOCS_DIR, `${fileName}.md`);
    const content = await readFile(filePath, 'utf8');
    const html = marked(content);
    
    return {
      content: html,
      title: fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
  } catch (error) {
    console.error('Error reading markdown file:', error);
    return null;
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

// Individual documentation pages
router.get('/:docName', async (req, res) => {
  const { docName } = req.params;
  const docs = await getDocumentationFiles();
  const docData = await readMarkdownFile(docName);
  
  if (!docData) {
    return res.status(404).render('error', {
      title: 'Document Not Found',
      footer: footerConfig,
      error: { status: 404, message: 'Documentation file not found' }
    });
  }
  
  res.render('help-doc', {
    title: docData.title,
    footer: footerConfig,
    docs: docs,
    content: docData.content,
    currentDoc: docName
  });
});

// Export the router
export default router;