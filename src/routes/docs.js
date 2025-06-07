import express from 'express';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import footerConfig from '../config/footer.config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..');
const DOCS_DIR = join(ROOT_DIR, 'docs');

// Additional documentation directories to check
const ADDITIONAL_DOC_PATHS = [
  { dir: ROOT_DIR, category: 'Debug & Troubleshooting', pattern: /^(DEBUG|TROUBLESHOOTING)\.md$/i },
  { dir: join(ROOT_DIR, 'src', 'public', 'docs'), category: 'Help & Guides', pattern: /\.md$/i }
];

// Configure marked with highlight.js for syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-', // highlight.js css expects a language-* class
  gfm: true,                    // GitHub Flavored Markdown
  breaks: true,                 // Convert \n to <br>
  headerIds: true,              // Add ids to headings
  mangle: false,                // Don't escape HTML
  smartLists: true,             // Use smarter list behavior
  smartypants: true,            // Use "smart" typographic punctuation
});

/**
 * Get a list of all available Markdown files in the docs directory and additional locations
 * @returns {Promise<Array>} Array of document objects with name, path, title, and category
 */
async function getMarkdownFiles() {
  try {
    // Get files from main docs directory
    const files = await fs.readdir(DOCS_DIR);
    let allFiles = files
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file,
        fullPath: join(DOCS_DIR, file),
        relativePath: file,
        baseCategory: 'General',
      }));
    
    // Get files from additional directories
    for (const additionalPath of ADDITIONAL_DOC_PATHS) {
      const additionalFiles = await fs.readdir(additionalPath.dir);
      const matchingFiles = additionalFiles
        .filter(file => file.match(additionalPath.pattern))
        .map(file => ({
          name: file,
          fullPath: join(additionalPath.dir, file),
          relativePath: `../${file}`, // Use relative path from docs directory
          baseCategory: additionalPath.category,
        }));
      
      allFiles = [...allFiles, ...matchingFiles];
    }
    
    // Process each file to extract metadata
    const markdownFiles = await Promise.all(
      allFiles.map(async file => {
        const content = await fs.readFile(file.fullPath, 'utf8');
        
        // Extract front matter if available
        let title = file.name.replace('.md', '').replace(/[-_]/g, ' ');
        let description = '';
        let category = file.baseCategory;
        let order = 100; // Default order value
        let tags = [];
        
        // Improved front matter parsing
        const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
        if (frontMatterMatch) {
          const frontMatter = frontMatterMatch[1];
          
          // Extract metadata with better regex patterns
          const titleMatch = frontMatter.match(/title:\s*(.*?)(?:\n|$)/);
          const descMatch = frontMatter.match(/description:\s*(.*?)(?:\n|$)/);
          const categoryMatch = frontMatter.match(/category:\s*(.*?)(?:\n|$)/);
          const orderMatch = frontMatter.match(/order:\s*(\d+)(?:\n|$)/);
          const tagsMatch = frontMatter.match(/tags:\s*(.*?)(?:\n|$)/);
          
          if (titleMatch) title = titleMatch[1].trim();
          if (descMatch) description = descMatch[1].trim();
          if (categoryMatch) category = categoryMatch[1].trim();
          if (orderMatch) order = parseInt(orderMatch[1].trim(), 10);
          if (tagsMatch) {
            tags = tagsMatch[1].split(',').map(tag => tag.trim());
          }
        }
        
        // Use first h1 as title if no front matter title
        if (!frontMatterMatch || !frontMatterMatch[1].includes('title:')) {
          const h1Match = content.match(/^#\s+(.*?)(?:\n|$)/m);
          if (h1Match) {
            title = h1Match[1].trim();
          }
        }
        
        const relativeName = file.relativePath.replace('.md', '');
        const urlPath = relativeName.startsWith('../') 
          ? `/docs/${relativeName.substring(3)}` 
          : `/docs/${relativeName}`;
        
        return {
          name: file.name,
          path: urlPath,
          fullPath: file.fullPath,
          title: title,
          description: description || `Documentation for ${title}`,
          category: category,
          order: order,
          tags: tags
        };
      })
    );
    
    // Sort by category and then by order
    return markdownFiles.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.order - b.order;
    });
  } catch (error) {
    console.error('Error reading markdown files:', error.message);
    return [];
  }
}

/**
 * Read and parse a markdown file
 * @param {string} fileName - The name of the markdown file to read
 * @returns {Promise<Object>} The parsed markdown content and metadata
 */
async function readMarkdownFile(fileName) {
  try {
    // Determine if this is a root-level documentation file
    let isRootDoc = false;
    let filePath;
    
    // If no extension, add .md
    if (!fileName.includes('.')) {
      fileName = `${fileName}.md`;
    }
    
    // Check if this is a root-level documentation file
    for (const additionalPath of ADDITIONAL_DOC_PATHS) {
      const possiblePath = join(additionalPath.dir, fileName);
      try {
        await fs.access(possiblePath);
        filePath = possiblePath;
        isRootDoc = true;
        break;
      } catch (e) {
        // File doesn't exist in this location, continue
      }
    }
    
    // If not found in additional paths, check in main docs directory
    if (!isRootDoc) {
      filePath = join(DOCS_DIR, fileName);
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse the front matter if it exists
    let title = fileName.replace('.md', '').replace(/[-_]/g, ' ');
    let description = '';
    let category = isRootDoc ? 'Debug & Troubleshooting' : 'General';
    let order = 100;
    let tags = [];
    let lastUpdated = null;
    
    // Get file stats for last updated date
    try {
      const stats = await fs.stat(filePath);
      lastUpdated = stats.mtime;
    } catch (e) {
      console.error('Error getting file stats:', e.message);
    }
    
    // Enhanced front matter parsing
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    let markdownContent = content;
    
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1];
      markdownContent = content.replace(frontMatterMatch[0], '');
      
      // Extract metadata with better regex patterns
      const titleMatch = frontMatter.match(/title:\s*(.*?)(?:\n|$)/);
      const descMatch = frontMatter.match(/description:\s*(.*?)(?:\n|$)/);
      const categoryMatch = frontMatter.match(/category:\s*(.*?)(?:\n|$)/);
      const orderMatch = frontMatter.match(/order:\s*(\d+)(?:\n|$)/);
      const tagsMatch = frontMatter.match(/tags:\s*(.*?)(?:\n|$)/);
      const dateMatch = frontMatter.match(/date:\s*(.*?)(?:\n|$)/);
      
      if (titleMatch) title = titleMatch[1].trim();
      if (descMatch) description = descMatch[1].trim();
      if (categoryMatch) category = categoryMatch[1].trim();
      if (orderMatch) order = parseInt(orderMatch[1].trim(), 10);
      if (tagsMatch) tags = tagsMatch[1].split(',').map(tag => tag.trim());
      if (dateMatch) {
        try {
          lastUpdated = new Date(dateMatch[1].trim());
        } catch (e) {
          console.error('Error parsing date:', e.message);
        }
      }
    }
    
    // Use first h1 as title if no front matter title
    if (!frontMatterMatch || !frontMatterMatch[1].includes('title:')) {
      const h1Match = markdownContent.match(/^#\s+(.*?)(?:\n|$)/m);
      if (h1Match) {
        title = h1Match[1].trim();
      }
    }
    
    // Process table of contents with more options
    const tocRegex = /\[TOC\]|\[\[TOC\]\]|\{\{TOC\}\}|\{\{table-of-contents\}\}/gi;
    let hasToc = tocRegex.test(markdownContent);
    let tocDepth = 3; // Default depth for TOC (h1-h3)
    
    // Check for TOC with depth specification: [TOC:2] for depth 2
    const tocDepthRegex = /\[TOC:(\d+)\]|\[\[TOC:(\d+)\]\]|\{\{TOC:(\d+)\}\}|\{\{table-of-contents:(\d+)\}\}/gi;
    let tocDepthMatch;
    while ((tocDepthMatch = tocDepthRegex.exec(markdownContent)) !== null) {
      hasToc = true;
      const depth = parseInt(tocDepthMatch[1] || tocDepthMatch[2] || tocDepthMatch[3] || tocDepthMatch[4], 10);
      if (depth >= 1 && depth <= 6) {
        tocDepth = depth;
      }
      markdownContent = markdownContent.replace(tocDepthMatch[0], '<div class="table-of-contents-placeholder"></div>');
    }
    
    // Replace remaining TOC placeholders
    markdownContent = markdownContent.replace(tocRegex, '<div class="table-of-contents-placeholder"></div>');
    
    // Convert markdown to HTML
    const html = marked(markdownContent);
    
    // Generate table of contents if needed
    let tableOfContents = '';
    if (hasToc) {
      const headingRegex = new RegExp(`<h([1-${tocDepth}])\\s+id="([^"]+)">([^<]+)<\\/h[1-${tocDepth}]>`, 'g');
      let match;
      let tocItems = [];
      
      while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1], 10);
        const id = match[2];
        const text = match[3];
        
        tocItems.push({
          level,
          id,
          text
        });
      }
      
      if (tocItems.length > 0) {
        tableOfContents = '<nav class="table-of-contents"><ul class="toc-list">';
        let currentLevel = Math.min(...tocItems.map(item => item.level));
        let previousLevel = currentLevel;
        
        for (const item of tocItems) {
          // Skip the main title (h1) if it's the first and only h1
          if (item.level === 1 && tocItems.filter(i => i.level === 1).length === 1 && tocItems.indexOf(item) === 0) {
            continue;
          }
          
          if (item.level > previousLevel) {
            // Add nested list for each level difference
            for (let i = previousLevel; i < item.level; i++) {
              tableOfContents += '<ul class="toc-sublist">';
            }
          } else if (item.level < previousLevel) {
            // Close lists for each level difference
            for (let i = item.level; i < previousLevel; i++) {
              tableOfContents += '</ul></li>';
            }
          } else if (item.level === previousLevel && item !== tocItems[0]) {
            // Close previous list item if at same level (not first item)
            tableOfContents += '</li>';
          }
          
          tableOfContents += `<li class="toc-item toc-level-${item.level}"><a href="#${item.id}">${item.text}</a>`;
          previousLevel = item.level;
        }
        
        // Close any remaining open lists
        for (let i = 1; i < previousLevel; i++) {
          tableOfContents += '</li></ul>';
        }
        
        tableOfContents += '</li></ul></nav>';
      }
    }
    
    // Replace the TOC placeholder with the actual TOC
    const htmlWithToc = hasToc 
      ? html.replace('<div class="table-of-contents-placeholder"></div>', `<div class="table-of-contents">${tableOfContents}</div>`)
      : html;
    
    // Generate heading anchors for better navigation
    const anchors = [];
    const headingRegex = /<h([1-6])\s+id="([^"]+)">([^<]+)<\/h[1-6]>/g;
    let match;
    
    while ((match = headingRegex.exec(htmlWithToc)) !== null) {
      const level = parseInt(match[1], 10);
      const id = match[2];
      const text = match[3];
      
      anchors.push({
        level,
        id,
        text
      });
    }
    
    return {
      title,
      description,
      category,
      order,
      tags,
      lastUpdated,
      content: htmlWithToc,
      rawMarkdown: markdownContent,
      tableOfContents,
      anchors,
      fileName: fileName
    };
  } catch (error) {
    console.error(`Error reading markdown file ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Documentation home page - lists all available docs
 */
router.get('/', async (req, res) => {
  try {
    const markdownFiles = await getMarkdownFiles();
    
    // Group documents by category
    const groupedFiles = markdownFiles.reduce((groups, file) => {
      const category = file.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(file);
      return groups;
    }, {});
    
    // Get categories in order (General first, then alphabetically)
    const categories = Object.keys(groupedFiles).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
      res.render('docs/docs-index', {
      title: 'Documentation',
      description: 'Browse all documentation files',
      files: markdownFiles,
      groupedFiles,
      categories,
      footer: footerConfig
    });
  } catch (error) {
    console.error('Error listing documentation:', error.message);    res.status(500).render('error', {
      title: 'Error',
      error: 'Could not load documentation list',
      message: error.message,
      footer: footerConfig
    });
  }
});

/**
 * View a specific documentation file
 */
router.get('/:name', async (req, res) => {
  try {
    const fileName = req.params.name;
    const doc = await readMarkdownFile(fileName);
    const markdownFiles = await getMarkdownFiles();
    
    // Group documents by category for the sidebar
    const groupedFiles = markdownFiles.reduce((groups, file) => {
      const category = file.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(file);
      return groups;
    }, {});
    
    // Get categories in order (General first, then alphabetically)
    const categories = Object.keys(groupedFiles).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
    
    // Find previous and next documents for navigation
    const allSortedFiles = markdownFiles.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.order - b.order;
    });
    
    const currentIndex = allSortedFiles.findIndex(file => file.name === doc.fileName);
    const prevDoc = currentIndex > 0 ? allSortedFiles[currentIndex - 1] : null;
    const nextDoc = currentIndex < allSortedFiles.length - 1 ? allSortedFiles[currentIndex + 1] : null;
      res.render('docs/docs-view', {
      title: doc.title,
      description: doc.description,
      content: doc.content,
      rawMarkdown: doc.rawMarkdown,
      fileName: fileName,
      files: markdownFiles,
      groupedFiles,
      categories,
      currentDoc: fileName,
      category: doc.category,
      tableOfContents: doc.tableOfContents,
      tags: doc.tags,
      lastUpdated: doc.lastUpdated,
      prevDoc,
      nextDoc,
      anchors: doc.anchors,
      footer: footerConfig
    });
  } catch (error) {
    console.error('Error reading documentation:', error.message);
    
    if (error.code === 'ENOENT') {      return res.status(404).render('error', {
        title: 'Documentation Not Found',
        error: `The document "${req.params.name}" was not found`,
        message: 'Please check the URL or return to the documentation index',
        footer: footerConfig
      });
    }
      res.status(500).render('error', {
      title: 'Error',
      error: 'Could not load documentation',
      message: error.message,
      footer: footerConfig
    });
  }
});

/**
 * Get the raw markdown content
 */
router.get('/:name/raw', async (req, res) => {
  try {
    const fileName = req.params.name;
    const doc = await readMarkdownFile(fileName);
    
    res.set('Content-Type', 'text/plain');
    res.send(doc.rawMarkdown);
  } catch (error) {
    console.error('Error reading raw documentation:', error.message);
    
    if (error.code === 'ENOENT') {
      return res.status(404).send(`The document "${req.params.name}" was not found`);
    }
    
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * Search documentation
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.json({ results: [] });
    }
    
    const markdownFiles = await getMarkdownFiles();
    const searchResults = await Promise.all(
      markdownFiles.map(async file => {
        try {
          const doc = await readMarkdownFile(file.name);
          const searchableText = `${doc.title} ${doc.description} ${doc.rawMarkdown}`.toLowerCase();
          const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
          
          let allTermsMatch = true;
          let relevance = 0;
          
          // Check if all terms match
          for (const term of queryTerms) {
            if (!searchableText.includes(term)) {
              allTermsMatch = false;
              break;
            }
            
            // Calculate relevance based on where terms appear
            if (doc.title.toLowerCase().includes(term)) relevance += 10;
            if (doc.description.toLowerCase().includes(term)) relevance += 5;
            
            // Check if terms match tags
            if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(term))) {
              relevance += 8;
            }
            
            // Add relevance for each occurrence in content
            const termMatches = (doc.rawMarkdown.toLowerCase().match(new RegExp(term, 'g')) || []).length;
            relevance += Math.min(termMatches, 10); // Cap at 10 to avoid overwhelming score
          }
          
          if (!allTermsMatch) {
            return null;
          }
          
          // Find context for search result
          const contentLines = doc.rawMarkdown.split('\n');
          let matchingLines = [];
          
          for (let i = 0; i < contentLines.length; i++) {
            const line = contentLines[i].toLowerCase();
            if (queryTerms.some(term => line.includes(term))) {
              // Get some context around the match (2 lines before and after)
              const startLine = Math.max(0, i - 2);
              const endLine = Math.min(contentLines.length - 1, i + 2);
              const context = contentLines.slice(startLine, endLine + 1).join('\n');
              
              // Highlight the matching terms in context
              let highlightedContext = context;
              for (const term of queryTerms) {
                const regex = new RegExp(`(${term})`, 'gi');
                highlightedContext = highlightedContext.replace(regex, '**$1**');
              }
              
              matchingLines.push({
                line: i + 1,
                context: highlightedContext
              });
              
              // Increase relevance score based on heading matches
              if (line.startsWith('#')) {
                relevance += 5;
              }
              
              // Limit to 3 context snippets per file
              if (matchingLines.length >= 3) break;
            }
          }
          
          // Add to relevance if this document is in a category that matches the search
          if (doc.category.toLowerCase().includes(query.toLowerCase())) {
            relevance += 5;
          }
          
          return {
            file: file,
            relevance: relevance,
            matchingLines: matchingLines,
            category: doc.category,
            tags: doc.tags || []
          };
        } catch (error) {
          console.error(`Error searching in ${file.name}:`, error.message);
          return null;
        }
      })
    );
    
    // Filter out null results and sort by relevance
    const filteredResults = searchResults
      .filter(result => result !== null)
      .sort((a, b) => b.relevance - a.relevance);
    
    // Group results by category
    const groupedResults = filteredResults.reduce((groups, result) => {
      const category = result.file.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(result);
      return groups;
    }, {});
    
    res.json({ 
      results: filteredResults,
      groupedResults,
      query,
      totalResults: filteredResults.length
    });
  } catch (error) {
    console.error('Error searching documentation:', error.message);
    res.status(500).json({
      error: 'Error searching documentation',
      message: error.message
    });
  }
});

// HTML search route removed - use JSON search endpoint instead

/**
 * Get document list as JSON (for API usage)
 */
router.get('/api/list', async (req, res) => {
  try {
    const markdownFiles = await getMarkdownFiles();
    
    // Group documents by category
    const groupedFiles = markdownFiles.reduce((groups, file) => {
      const category = file.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(file);
      return groups;
    }, {});
    
    // Get categories in order (General first, then alphabetically)
    const categories = Object.keys(groupedFiles).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
    
    res.json({ 
      documents: markdownFiles,
      groupedDocuments: groupedFiles,
      categories: categories
    });
  } catch (error) {
    console.error('Error listing documentation:', error.message);
    res.status(500).json({
      error: 'Error listing documentation',
      message: error.message
    });
  }
});

/**
 * Get a specific document as JSON (for API usage)
 */
router.get('/api/document/:name', async (req, res) => {
  try {
    const fileName = req.params.name;
    const doc = await readMarkdownFile(fileName);
    
    res.json({ 
      document: {
        title: doc.title,
        description: doc.description,
        category: doc.category,
        tags: doc.tags,
        lastUpdated: doc.lastUpdated,
        content: doc.content,
        rawMarkdown: doc.rawMarkdown,
        anchors: doc.anchors,
        fileName: doc.fileName
      }
    });
  } catch (error) {
    console.error('Error retrieving document:', error.message);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'Document not found',
        message: `The document "${req.params.name}" was not found`
      });
    }
    
    res.status(500).json({
      error: 'Error retrieving document',
      message: error.message
    });
  }
});

/**
 * Get all tags used in documentation
 */
router.get('/api/tags', async (req, res) => {
  try {
    const markdownFiles = await getMarkdownFiles();
    
    // Extract all tags from documents
    const allTags = markdownFiles.reduce((tags, file) => {
      if (file.tags && Array.isArray(file.tags)) {
        file.tags.forEach(tag => {
          if (!tags.includes(tag)) {
            tags.push(tag);
          }
        });
      }
      return tags;
    }, []);
    
    // Sort tags alphabetically
    allTags.sort();
    
    res.json({ tags: allTags });
  } catch (error) {
    console.error('Error retrieving tags:', error.message);
    res.status(500).json({
      error: 'Error retrieving tags',
      message: error.message
    });
  }
});

export default router;
