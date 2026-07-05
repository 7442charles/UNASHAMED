# Dockerfile
FROM node:18-slim

# Install nodemon globally
RUN npm install -g nodemon

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the port
EXPOSE 4090

# Command to run the app
CMD ["npm", "run", "dev"]