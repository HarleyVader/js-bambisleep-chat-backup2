import { dirname, join } from 'path';

import express from 'express';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import hljs from 'highlight.js';
import { marked } from 'marked';
import footerConfig from '../config/footer.config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..');
const DOCS_DIR = join(ROOT_DIR, 'docs');

// Configure marked with highlight.js for syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false,
  smartLists: true,
  smartypants: true,
});

/**
 * Get a list of all available Markdown files in the docs directory
 */
async function getMarkdownFiles() {
  try {
    const files = await fs.readdir(DOCS_DIR);
    const mdFiles = files
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file,
        title: file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        path: `/help/${file.replace('.md', '')}`
      }));
    
    return mdFiles;
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
    const filePath = join(DOCS_DIR, `${fileName}.md`);
    const content = await fs.readFile(filePath, 'utf8');
    const html = marked(content);
    return html;
  } catch (error) {
    console.error('Error reading markdown file:', error);
    return null;
  }
}

// Help center home page
router.get('/', async (req, res) => {
  try {
    const files = await getMarkdownFiles();
    res.render('help', { 
      title: 'Help Center',
      files: files,
      footer: footerConfig
    });
  } catch (error) {
    console.error('Error rendering help page:', error);
    res.status(500).render('error', { error: { status: 500, message: 'Internal Server Error' } });
  }
});

// Individual help document
router.get('/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const files = await getMarkdownFiles();
    const content = await readMarkdownFile(fileName);
    
    if (!content) {
      return res.status(404).render('error', { 
        error: { status: 404, message: 'Documentation not found' } 
      });
    }
    
    const title = fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    res.render('help', {
      title: title,
      content: content,
      files: files,
      fileName: fileName,
      footer: footerConfig
    });
  } catch (error) {
    console.error('Error rendering help document:', error);
    res.status(500).render('error', { error: { status: 500, message: 'Internal Server Error' } });
  }
});

export default router;
