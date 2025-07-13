import express from 'express';
import Logger from '../utils/logger.js';
import footerConfig from '../config/footer.config.js';

const logger = new Logger('PsychodelicRoutes');
const router = express.Router();

// Define the base path for this router
export const basePath = '/psychodelic';

// Define route handlers
router.get('/', (req, res) => {
  res.render('psychodelic', { 
    title: 'Psychodelic Trigger Mania',
    validConstantsCount: 5,
    footer: footerConfig,
    req: req  // Pass the entire req object to the template
  });
});

// Export the router
export default router;