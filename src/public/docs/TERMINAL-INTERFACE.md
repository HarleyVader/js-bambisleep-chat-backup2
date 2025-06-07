# 🖥️ BambiSleep Chat Terminal Interface

An HTOP-style terminal interface for BambiSleep Chat with real-time logging and interactive commands.

## Features

- **Real-time Log Display**: See all server logs in a beautiful terminal interface
- **Interactive Commands**: Execute git, npm, and server commands without closing the terminal
- **HTOP-style Layout**: Familiar interface inspired by system monitoring tools
- **Keyboard Shortcuts**: Quick access to common operations
- **Auto-scroll Logs**: Always stay up-to-date with the latest activity

## Quick Start

### Start with Terminal Interface
```bash
npm run terminal
```

### Start with Development Mode + Terminal
```bash
npm run terminal:dev
```

### Start Boot Script with Terminal
```bash
npm run boot:terminal
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `g` | Git pull latest changes |
| `n` | NPM install dependencies |
| `r` | Restart server |
| `c` | Clear logs |
| `s` | Show system status |
| `?` | Show help |
| `q` | Quit interface |
| `↑/↓` | Scroll logs |
| `PgUp/PgDn` | Page scroll |

## Interface Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         📊 Real-time Logs                      │
│                                                                 │
│ [12:34:56] INFO: Server started successfully                   │
│ [12:34:57] SUCCESS: Database connected                         │
│ [12:34:58] INFO: Socket.io initialized                        │
│                                                                 │
│                           (80% height)                         │
└─────────────────────────────────────────────────────────────────┤
│ 🚀 Status: Ready                    │ ⌨️  Commands:             │
│ BambiSleep Chat running              │ g - Git pull              │
│                                      │ n - NPM install           │
│ (10% height)                         │ r - Restart               │
│                                      │ c - Clear logs            │
│                                      │ ? - Help                  │
└──────────────────────────────────────┴───────────────────────────┘
```

## Environment Variables

- `TERMINAL_UI=true` - Enable terminal interface mode
- Add to your `.env` file or set when running commands

## Integration with Existing Code

The terminal interface integrates seamlessly with:

- **Logger**: All log messages appear in the terminal interface
- **AIGF Logger**: AIGF interactions are displayed in real-time  
- **X-Hypno-Boot**: Git pull, npm install, and restart commands reuse existing logic

## Advanced Usage

### Custom Terminal Interface
```javascript
import TerminalInterface from './src/utils/terminalInterface.js';

const terminal = new TerminalInterface();
terminal.init();

// Add custom log
terminal.addLog('info', 'Custom message');

// Execute custom command
terminal.executeCommand('ls -la', 'List files');
```

### Hook into Logger
```javascript
import { enableTerminalInterface } from './src/utils/logger.js';

// Enable terminal interface programmatically
enableTerminalInterface();
```

## Troubleshooting

### Terminal Interface Not Starting
1. Check that `blessed` is installed: `npm install blessed`
2. Ensure terminal supports ANSI colors
3. Try running with `TERM=xterm-256color`

### Commands Not Working
1. Verify you're in the correct directory
2. Check permissions for git operations
3. Ensure npm is accessible in PATH

### Logs Not Appearing
1. Make sure logger is properly initialized
2. Check console output for errors
3. Try restarting the terminal interface

## Contributing

The terminal interface is designed to be easily extensible:

1. Add new commands in `setupKeyBindings()`
2. Extend log formatting in `addLog()`
3. Add new UI components using blessed widgets

## Dependencies

- `blessed` - Terminal UI library
- `chalk` - Color formatting (already included)
- Existing BambiSleep Chat dependencies

---

*Part of the BambiSleep Chat project - enhancing the development and monitoring experience.*
