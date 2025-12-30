package main

import (
	"log"
	"os"

	"icp-coder/backend/internal/api"
	"icp-coder/backend/internal/database"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize database
	db, err := database.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Setup router
	router := gin.Default()

	// CORS configuration
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "x-api-key"}
	router.Use(cors.New(config))

	// Setup routes
	api.SetupRoutes(router, db)

	// Start server
	log.Printf("🚀 Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
