#!/bin/bash

# DineBoard 1-Click Production Deploy Script
echo "🚀 Starting DineBoard Production Deployment for 50+ Restaurants..."

# 1. Pull latest code & env
git pull origin main

# 2. Run Database Migrations
docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

# 3. Build & Restart Containers
docker-compose -f docker-compose.prod.yml up -d --build --remove-orphans

# 4. Check Health Status
docker-compose -f docker-compose.prod.yml ps

echo "✅ DineBoard Production Stack Live & Running!"
