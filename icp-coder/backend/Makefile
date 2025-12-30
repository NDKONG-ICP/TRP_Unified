.PHONY: up down dev dev-logs dev-down build clean

# Start services with Docker Compose
up:
	docker-compose up -d
	@echo "✅ Services started. Backend: http://localhost:8080"

# Stop services
down:
	docker-compose down

# Development mode with live reload
dev:
	docker-compose -f docker-compose.dev.yml up

# View development logs
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Stop development services
dev-down:
	docker-compose -f docker-compose.dev.yml down

# Build Go binary
build:
	go build -o bin/server ./cmd/server

# Clean build artifacts
clean:
	rm -rf bin/
	go clean

# Run migrations
migrate:
	go run scripts/migrate.go

# Run tests
test:
	go test ./...
