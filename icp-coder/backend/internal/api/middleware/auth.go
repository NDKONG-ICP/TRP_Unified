package middleware

import (
	"net/http"
	"strings"

	"icp-coder/backend/internal/database"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func APIKeyAuth(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("x-api-key")
		if apiKey == "" {
			// Try Authorization header
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				apiKey = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if apiKey == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "API key required"})
			c.Abort()
			return
		}

		// Validate API key
		var key database.APIKey
		if err := db.Where("key = ?", apiKey).First(&key).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
			c.Abort()
			return
		}

		// Set user ID in context
		c.Set("user_id", key.UserID)
		c.Next()
	}
}
