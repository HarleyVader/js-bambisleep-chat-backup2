# Debugging BambiSleep Chat Application

This document contains instructions and solutions for common issues encountered when debugging the BambiSleep Chat application.

## Common Issues and Solutions

### 1. "No default engine was specified and no extension was provided"

This error occurs when Express tries to render a view but the view engine is not properly configured.

**Solution:**

```javascript
// Add to server.js after app initialization
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
```

### 2. "modelsRegistered is not defined"

This error occurs in the database connection module.

**Solution:**
Make sure the `modelsRegistered` variable is properly defined in `src/config/db.js`.

### 3. Database Connection Issues

If you're having trouble connecting to the MongoDB database:

**Solution:**

1. Verify the MongoDB container is running:

   ```bash
   docker ps | grep bambisleep-mongodb
   ```

2. Check the MongoDB connection string in your `.env` file:

   ```env
   MONGODB_URI=mongodb://bambisleep:bambiAppPass456@localhost:27018/profilesDB?authSource=admin
   ```

3. Test the connection manually:

   ```bash
   docker exec -it bambisleep-mongodb mongosh -u bambisleep -p bambiAppPass456 --authenticationDatabase admin
   ```

### 4. Port Already in Use

If you see "address already in use" errors:

**Solution:**

1. Find the process using the port:

   ```powershell
   netstat -ano | findstr :6970
   ```

2. Kill the process:

   ```powershell
   Stop-Process -Id <PID> -Force
   ```

3. Change the port in `.env`:

   ```env
   SERVER_PORT=6971
   ```

## Debugging Steps

1. Start with `npm run debug` to enable the Node.js inspector
2. Connect VS Code or Chrome DevTools to the debugger
3. Set breakpoints in problematic areas
4. Look for error messages in the console output
5. Check database connections with the `test-db.js` script

## Useful Debug Points

- `src/server.js`: Main application initialization
- `src/config/db.js`: Database connection handling
- `src/routes/index.js`: Main route handling
- `src/services/sessionService.js`: Session management

## Testing API Endpoints

Use curl to test API endpoints:

```bash
curl http://localhost:6970/api/db-status
```

## Debug Mode with Additional Logging

Run with additional debugging information:

```bash
DEBUG=express:* npm run debug
```
