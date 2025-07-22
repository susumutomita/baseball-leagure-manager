#!/bin/bash

echo "=== Baseball League Manager Setup ==="

# Stop and remove existing containers
echo "Cleaning up existing containers..."
docker-compose down -v

# Build the development image
echo "Building Docker image..."
docker-compose build --no-cache

# Start the services
echo "Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Run bundle install inside container
echo "Installing Ruby dependencies..."
docker-compose exec -T web bundle install

# Setup database
echo "Setting up database..."
docker-compose exec -T web bundle exec rails db:create
docker-compose exec -T web bundle exec rails db:migrate

# Create empty asset files to prevent errors
echo "Creating asset directories..."
docker-compose exec -T web mkdir -p app/assets/builds
docker-compose exec -T web touch app/assets/builds/application.js
docker-compose exec -T web touch app/assets/builds/application.css

echo "=== Setup Complete ==="
echo "Application: http://localhost:3000"
echo "KeyCloak: http://localhost:8080"
echo ""
echo "To view logs: docker-compose logs -f"