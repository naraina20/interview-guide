# Use Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Build the React app
RUN npm run build

# Install 'serve' globally to serve the production build
RUN npm install -g serve

# Expose port 3000 for the frontend
EXPOSE 3000

# Command to serve the build directory
CMD ["serve", "-s", "dist", "-l", "3000"]
