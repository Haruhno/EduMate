# EduMate Docker Makefile
# Simplified commands for Docker operations

.PHONY: help setup build start stop restart logs clean logs-auth logs-blockchain logs-message logs-web

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)EduMate Docker Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

setup: ## Setup Docker environment (copy .env)
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.docker.example...$(NC)"; \
		cp .env.docker.example .env; \
		echo "$(GREEN)✓ .env created. Please update it with your values.$(NC)"; \
	else \
		echo "$(GREEN)✓ .env already exists$(NC)"; \
	fi

build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build --no-cache

build-web: ## Build web app only
	@echo "$(BLUE)Building web app...$(NC)"
	docker-compose build --no-cache web-app

build-auth: ## Build auth-service only
	@echo "$(BLUE)Building auth-service...$(NC)"
	docker-compose build --no-cache auth-service

build-blockchain: ## Build blockchain-service only
	@echo "$(BLUE)Building blockchain-service...$(NC)"
	docker-compose build --no-cache blockchain-service

build-message: ## Build message-service only
	@echo "$(BLUE)Building message-service...$(NC)"
	docker-compose build --no-cache message-service

build-cv: ## Build cv-parser-service only
	@echo "$(BLUE)Building cv-parser-service...$(NC)"
	docker-compose build --no-cache cv-parser-service

start: ## Start all services
	@echo "$(BLUE)Starting all services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ All services started$(NC)"
	@echo ""
	@echo "Service URLs:"
	@echo "  $(YELLOW)Web App:$(NC)              http://localhost:5173"
	@echo "  $(YELLOW)Auth Service:$(NC)         http://localhost:3001"
	@echo "  $(YELLOW)Blockchain Service:$(NC)   http://localhost:3003"
	@echo "  $(YELLOW)Message Service:$(NC)      http://localhost:3002"
	@echo "  $(YELLOW)CV Parser:$(NC)            http://localhost:5001"

stop: ## Stop all services (preserve data)
	@echo "$(BLUE)Stopping all services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ All services stopped$(NC)"

restart: ## Restart all services
	@echo "$(BLUE)Restarting all services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ All services restarted$(NC)"

clean: ## Stop all services and remove volumes (WARNING: loses data)
	@echo "$(RED)⚠ WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Removing all containers and volumes...$(NC)"; \
		docker-compose down -v; \
		echo "$(GREEN)✓ Cleanup complete$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

full-clean: ## Complete Docker cleanup (removes images too)
	@echo "$(RED)⚠ WARNING: This will remove all Docker images, containers, and volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Removing all Docker objects...$(NC)"; \
		docker compose down -v; \
		docker system prune -a; \
		echo "$(GREEN)✓ Full cleanup complete$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

ps: ## Show status of all services
	@docker-compose ps

logs: ## Show logs from all services (follow)
	@docker-compose logs -f

logs-auth: ## Show logs from auth-service
	@docker-compose logs -f auth-service

logs-blockchain: ## Show logs from blockchain-service
	@docker-compose logs -f blockchain-service

logs-message: ## Show logs from message-service
	@docker-compose logs -f message-service

logs-web: ## Show logs from web-app
	@docker-compose logs -f web-app

logs-cv: ## Show logs from cv-parser-service
	@docker-compose logs -f cv-parser-service

logs-postgres: ## Show logs from PostgreSQL
	@docker-compose logs -f postgres

logs-mongo: ## Show logs from MongoDB
	@docker-compose logs -f mongodb

logs-ganache: ## Show logs from Ganache
	@docker-compose logs -f ganache

logs-qdrant: ## Show logs from Qdrant
	@docker-compose logs -f qdrant

stats: ## Show Docker resource usage
	@docker stats

shell-auth: ## Open shell in auth-service
	@docker exec -it edumate-auth-service sh

shell-blockchain: ## Open shell in blockchain-service
	@docker exec -it edumate-blockchain-service sh

shell-message: ## Open shell in message-service
	@docker exec -it edumate-message-service sh

shell-cv: ## Open shell in cv-parser-service
	@docker exec -it edumate-cv-parser-service sh

shell-postgres: ## Open PostgreSQL shell
	@docker exec -it edumate-postgres psql -U edumate_user -d edumate

shell-mongo: ## Open MongoDB shell
	@docker exec -it edumate-mongodb mongosh

rebuild-auth: ## Rebuild and restart auth-service
	@echo "$(BLUE)Rebuilding auth-service...$(NC)"
	docker-compose up -d --build auth-service
	@echo "$(GREEN)✓ auth-service rebuilt and restarted$(NC)"

rebuild-blockchain: ## Rebuild and restart blockchain-service
	@echo "$(BLUE)Rebuilding blockchain-service...$(NC)"
	docker-compose up -d --build blockchain-service
	@echo "$(GREEN)✓ blockchain-service rebuilt and restarted$(NC)"

rebuild-message: ## Rebuild and restart message-service
	@echo "$(BLUE)Rebuilding message-service...$(NC)"
	docker-compose up -d --build message-service
	@echo "$(GREEN)✓ message-service rebuilt and restarted$(NC)"

rebuild-web: ## Rebuild and restart web-app
	@echo "$(BLUE)Rebuilding web-app...$(NC)"
	docker-compose up -d --build web-app
	@echo "$(GREEN)✓ web-app rebuilt and restarted$(NC)"

rebuild-cv: ## Rebuild and restart cv-parser-service
	@echo "$(BLUE)Rebuilding cv-parser-service...$(NC)"
	docker-compose up -d --build cv-parser-service
	@echo "$(GREEN)✓ cv-parser-service rebuilt and restarted$(NC)"

health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}"
	@echo ""
	@echo "$(BLUE)Testing health endpoints...$(NC)"
	@curl -s http://localhost:3001/health | jq . 2>/dev/null || echo "$(RED)Auth Service: unreachable$(NC)"
	@curl -s http://localhost:3003/health | jq . 2>/dev/null || echo "$(RED)Blockchain Service: unreachable$(NC)"
	@curl -s http://localhost:3002/health | jq . 2>/dev/null || echo "$(RED)Message Service: unreachable$(NC)"

version: ## Show Docker and Docker Compose versions
	@echo "$(BLUE)Docker Version Info:$(NC)"
	@docker --version
	@docker-compose --version

info: ## Show project info
	@echo "$(BLUE)EduMate Docker Project Info$(NC)"
	@echo "Services: 9 (1 frontend + 4 backends + 4 databases)"
	@echo "Network: edumate-network (bridge)"
	@echo "Volumes: 5 (postgres, mongodb, qdrant, ganache + transients)"
	@echo ""
	@echo "Frontend:  http://localhost:5173"
	@echo "Backends:  3001, 3002, 3003, 5001"
	@echo "Databases: 5432, 27017, 6333, 8545"

verify-setup: ## Verify Docker setup requirements
	@echo "$(BLUE)Verifying Docker setup...$(NC)"
	@command -v docker >/dev/null 2>&1 && echo "$(GREEN)✓ Docker installed$(NC)" || echo "$(RED)✗ Docker not found$(NC)"
	@command -v docker-compose >/dev/null 2>&1 && echo "$(GREEN)✓ Docker Compose installed$(NC)" || echo "$(RED)✗ Docker Compose not found$(NC)"
	@test -f .env && echo "$(GREEN)✓ .env file exists$(NC)" || echo "$(YELLOW)⚠ .env file missing (create with: make setup)$(NC)"
	@test -f docker-compose.yml && echo "$(GREEN)✓ docker-compose.yml exists$(NC)" || echo "$(RED)✗ docker-compose.yml not found$(NC)"

.DEFAULT_GOAL := help
