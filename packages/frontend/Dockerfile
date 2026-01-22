# MCxOSC Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production image with nginx
FROM nginx:alpine

# Build args for nginx config
ARG NGINX_BACKEND_HOST=backend
ARG NGINX_BACKEND_PORT=3000
ARG NGINX_LISTEN_PORT=80

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template and generate config
COPY nginx.conf /etc/nginx/templates/default.conf.template
RUN sed -i "s|proxy_pass http://backend:3000|proxy_pass http://${NGINX_BACKEND_HOST}:${NGINX_BACKEND_PORT}|g" /etc/nginx/templates/default.conf.template \
    && sed -i "s|listen 80|listen ${NGINX_LISTEN_PORT}|g" /etc/nginx/templates/default.conf.template \
    && cp /etc/nginx/templates/default.conf.template /etc/nginx/conf.d/default.conf

EXPOSE ${NGINX_LISTEN_PORT}

CMD ["nginx", "-g", "daemon off;"]
