# Use Node.js 18 alpine image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for backend and frontend
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci --only=production
RUN cd frontend && npm ci

# Copy source code
COPY backend/. ./backend/
COPY frontend/. ./frontend/

# Build frontend
RUN cd frontend && npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy only production dependencies from builder
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/src ./backend/src
# Create uploads directory
RUN mkdir -p ./backend/uploads
# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose port (will be set by Railway via ENV PORT)
EXPOSE 3000

# Start the server
CMD ["node", "backend/src/server.js"]