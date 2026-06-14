# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the nginx template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Cloud Run sets the PORT environment variable. Nginx alpine image uses envsubst automatically
# on files in /etc/nginx/templates/ to generate /etc/nginx/conf.d/
# We just need to expose the port (though Cloud Run overrides this)
EXPOSE 8080

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
