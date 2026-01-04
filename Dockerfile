FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]
