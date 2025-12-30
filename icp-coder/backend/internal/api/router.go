package api

import (
	"icp-coder/backend/internal/api/handlers"
	"icp-coder/backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth routes (no authentication required)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", handlers.Register(db))
			auth.POST("/login", handlers.Login(db))
		}

		// Protected routes (require API key)
		protected := v1.Group("")
		protected.Use(middleware.APIKeyAuth(db))
		{
			// API Key management
			protected.GET("/keys", handlers.GetAPIKeys(db))
			protected.POST("/keys", handlers.CreateAPIKey(db))
			protected.DELETE("/keys/:id", handlers.DeleteAPIKey(db))

			// RAG & Code Generation
			protected.GET("/context", handlers.GetMotokoContext(db))
			protected.POST("/generate", handlers.GenerateMotokoCode(db))
		}

		// Chat completion API (OpenAI-compatible)
		v1.POST("/chat/completions", middleware.APIKeyAuth(db), handlers.ChatCompletion(db))
	}
}
