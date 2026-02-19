#!/bin/bash
# Docker startup script for EduMate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        EduMate - Docker Composition Startup Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Copying from .env.docker.example...${NC}"
    if [ -f .env.docker.example ]; then
        cp .env.docker.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo -e "${YELLOW}⚠ Please update .env with your configuration values${NC}"
    else
        echo -e "${RED}✗ .env.docker.example not found${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Building Docker images...${NC}"
docker-compose build --no-cache

echo ""
echo -e "${BLUE}Starting all EduMate services...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✓ Services started successfully!${NC}"
echo ""
echo -e "${BLUE}Services Status:${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo -e "  ${GREEN}Web App${NC}:              ${YELLOW}http://localhost:5173${NC}"
echo -e "  ${GREEN}Auth Service${NC}:         ${YELLOW}http://localhost:3001${NC}"
echo -e "  ${GREEN}Blockchain Service${NC}:   ${YELLOW}http://localhost:3003${NC}"
echo -e "  ${GREEN}Message Service${NC}:      ${YELLOW}http://localhost:3002${NC}"
echo -e "  ${GREEN}CV Parser Service${NC}:    ${YELLOW}http://localhost:5001${NC}"
echo -e "  ${GREEN}Ganache (RPC)${NC}:        ${YELLOW}http://localhost:8545${NC}"
echo -e "  ${GREEN}Qdrant Vector DB${NC}:     ${YELLOW}http://localhost:6333${NC}"
echo -e "  ${GREEN}PostgreSQL${NC}:           ${YELLOW}localhost:5432${NC}"
echo -e "  ${GREEN}MongoDB${NC}:              ${YELLOW}localhost:27017${NC}"

echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  View logs:        ${YELLOW}docker-compose logs -f${NC}"
echo -e "  Stop services:    ${YELLOW}docker-compose down${NC}"
echo -e "  Stop + remove:    ${YELLOW}docker-compose down -v${NC}"
echo -e "  View service:     ${YELLOW}docker-compose logs -f [service-name]${NC}"
echo -e "  Rebuild service:  ${YELLOW}docker-compose build --no-cache [service-name]${NC}"

echo ""
echo -e "${GREEN}Start developing! 🚀${NC}"
