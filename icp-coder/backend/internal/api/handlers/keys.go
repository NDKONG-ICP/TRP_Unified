package handlers

import (
	"net/http"

	"icp-coder/backend/internal/auth"
	"icp-coder/backend/internal/database"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetAPIKeys(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")

		var keys []database.APIKey
		if err := db.Where("user_id = ?", userID).Find(&keys).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch API keys"})
			return
		}

		c.JSON(http.StatusOK, keys)
	}
}

func CreateAPIKey(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")

		apiKey := database.APIKey{
			UserID: userID.(uint),
			Key:    auth.GenerateAPIKey(),
		}

		if err := db.Create(&apiKey).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
			return
		}

		c.JSON(http.StatusCreated, apiKey)
	}
}

func DeleteAPIKey(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		keyID := c.Param("id")

		var key database.APIKey
		if err := db.Where("id = ? AND user_id = ?", keyID, userID).First(&key).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
			return
		}

		if err := db.Delete(&key).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete API key"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "API key deleted successfully"})
	}
}
