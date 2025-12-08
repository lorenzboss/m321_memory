# Production-optimized multi-stage build for Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
COPY vite.config.ts ./

# Build for production
ENV NODE_ENV=production
ARG REACT_APP_BACKEND_URL=http://localhost:8000
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
RUN echo 'server { \n\
    listen 3000; \n\
    server_name _; \n\
    root /usr/share/nginx/html; \n\
    index index.html; \n\
    gzip on; \n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \n\
    location / { \n\
        try_files $uri $uri/ /index.html; \n\
        add_header Cache-Control "no-cache"; \n\
    } \n\
    location /static/ { \n\
        expires 1y; \n\
        add_header Cache-Control "public, immutable"; \n\
    } \n\
}' > /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
