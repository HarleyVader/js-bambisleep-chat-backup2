#!/bin/bash

# Fix dependencies script for BambiSleep Chat
# This script should be run on the remote server to fix the EJS dependency issue

echo "Fixing Node.js dependencies for BambiSleep Chat..."

# Navigate to project directory
cd /home/brandynette/web/bambisleep.chat/js-bambisleep-chat

# Set up Node.js environment using NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Use the correct Node.js version
nvm use v24.1.0

# Clean and reinstall dependencies
echo "Cleaning node_modules..."
rm -rf node_modules
rm -f package-lock.json

echo "Installing dependencies..."
npm install

echo "Checking if EJS is installed..."
npm list ejs

echo "Dependencies fixed! You can now restart the server."
