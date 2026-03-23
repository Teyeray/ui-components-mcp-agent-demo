FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments for environment variables
ARG VITE_API_URL=http://localhost:8000
ARG VITE_SSE_URL=http://localhost:8000/events

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SSE_URL=$VITE_SSE_URL

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Serve the application
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
