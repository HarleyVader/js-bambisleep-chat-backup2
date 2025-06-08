import express from 'express';

const router = express.Router();

// Test routes for debugging templates
router.get('/maintenance', (req, res) => {
  res.status(503).render('maintenance', {
    title: 'Maintenance Mode - BambiSleep.Chat',
    message: 'Bambi is making everything prettier...',
    currentIssue: 'Updating hypnotic experience',
    countdown: 300, // 5 minutes
    estimatedCompletion: Date.now() + (5 * 60 * 1000)
  });
});

router.get('/circuit-breaker', (req, res) => {
  res.status(503).render('circuit-breaker', {
    title: 'Service Temporarily Unavailable - BambiSleep.Chat',
    message: 'Circuit breaker has been activated',
    currentIssue: 'System overload detected - cooling down',
    countdown: 180, // 3 minutes
    estimatedCompletion: Date.now() + (3 * 60 * 1000)
  });
});

router.get('/test-error', (req, res) => {
  res.status(500).render('error', {
    title: 'Test Error - BambiSleep.Chat',
    error: {
      status: 500,
      message: 'This is a test error message',
      description: 'Testing the error template'
    }
  });
});

export default router;
