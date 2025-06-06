# Use the official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install PM2 globally
RUN npm install pm2 -g

# Install app dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Set PM2 environment variables for monitoring
ENV PM2_PUBLIC_KEY eccuuo8utvbp9g3
ENV PM2_SECRET_KEY wbitflwoinahavz

# Expose the port the app runs on
EXPOSE 6969

# Use PM2 runtime to start the application
CMD ["pm2-runtime", "ecosystem.config.js"]
