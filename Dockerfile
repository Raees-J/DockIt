# Google Cloud Run Deployment

# Build the application
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build client
RUN npm run build --prefix client

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]