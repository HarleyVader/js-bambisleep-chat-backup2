const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.MAINTENANCE_PORT || 6970;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'src', 'public')));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'src', 'views'));

// Maintenance page route
app.get('*', (req, res) => {
  res.status(503).render('maintenance', {
    title: 'BambiSleep.Chat - Maintenance Mode',
    message: 'We are updating your hypnotic experience...',
    subtitle: 'Bambi is getting prettier! Please wait...',
    estimatedTime: '2-5 minutes'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Maintenance server running on port ${PORT}`);
  console.log(`📝 Displaying maintenance page for all requests`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Maintenance server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Maintenance server shutting down...');
  process.exit(0);
});
