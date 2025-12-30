package handlers

import (
	"net/http"

	"icp-coder/backend/internal/codegen"
	"icp-coder/backend/internal/database"
	"icp-coder/backend/internal/rag"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ContextRequest struct {
	Query string `json:"query" binding:"required"`
	Limit int    `json:"limit,omitempty"`
}

type GenerateRequest struct {
	Prompt      string  `json:"prompt" binding:"required"`
	Query       string  `json:"query,omitempty"` // Optional RAG query for context
	Temperature float64 `json:"temperature,omitempty"`
	MaxTokens   int     `json:"max_tokens,omitempty"`
}

func GetMotokoContext(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ContextRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.Limit == 0 {
			req.Limit = 5
		}

		ragService := rag.NewRAGService()
		context, err := ragService.GetContext(req.Query, req.Limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, context)
	}
}

func GenerateMotokoCode(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GenerateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Default values
		if req.Temperature == 0 {
			req.Temperature = 0.7
		}
		if req.MaxTokens == 0 {
			req.MaxTokens = 2000
		}

		// Get context from RAG if query provided
		var context string
		if req.Query != "" {
			ragService := rag.NewRAGService()
			ragContext, err := ragService.GetContext(req.Query, 5)
			if err == nil && len(ragContext.Results) > 0 {
				// Combine context results
				for _, result := range ragContext.Results {
					context += result.Content + "\n\n"
				}
			}
		}

		// Generate code
		codeGenService, err := codegen.NewCodeGenService()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		generateReq := codegen.GenerateRequest{
			Prompt:      req.Prompt,
			Context:     context,
			Temperature: req.Temperature,
			MaxTokens:   req.MaxTokens,
		}

		result, err := codeGenService.GenerateCode(generateReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}
