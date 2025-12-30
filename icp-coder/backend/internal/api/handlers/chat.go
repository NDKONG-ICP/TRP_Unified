package handlers

import (
	"net/http"
	"time"

	"icp-coder/backend/internal/codegen"
	"icp-coder/backend/internal/database"
	"icp-coder/backend/internal/rag"

	"github.com/google/uuid"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatCompletionRequest struct {
	Model       string        `json:"model,omitempty"`
	Messages    []ChatMessage `json:"messages" binding:"required"`
	Temperature float64      `json:"temperature,omitempty"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
}

type ChatCompletionResponse struct {
	ID      string        `json:"id"`
	Object  string        `json:"object"`
	Created int64         `json:"created"`
	Model   string        `json:"model"`
	Choices []ChatChoice  `json:"choices"`
}

type ChatChoice struct {
	Index        int         `json:"index"`
	Message      ChatMessage `json:"message"`
	FinishReason string      `json:"finish_reason"`
}

func ChatCompletion(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ChatCompletionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if len(req.Messages) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "messages array cannot be empty"})
			return
		}

		// Get last user message
		lastMessage := req.Messages[len(req.Messages)-1]
		if lastMessage.Role != "user" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "last message must be from user"})
			return
		}

		// Default values
		if req.Temperature == 0 {
			req.Temperature = 0.7
		}
		if req.MaxTokens == 0 {
			req.MaxTokens = 2000
		}

		// Get context from RAG
		ragService := rag.NewRAGService()
		ragContext, err := ragService.GetContext(lastMessage.Content, 5)
		var context string
		if err == nil && len(ragContext.Results) > 0 {
			for _, result := range ragContext.Results {
				context += result.Content + "\n\n"
			}
		}

		// Generate code
		codeGenService, err := codegen.NewCodeGenService()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		generateReq := codegen.GenerateRequest{
			Prompt:      lastMessage.Content,
			Context:     context,
			Temperature: req.Temperature,
			MaxTokens:   req.MaxTokens,
		}

		result, err := codeGenService.GenerateCode(generateReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Format as OpenAI-compatible response
		response := ChatCompletionResponse{
			ID:      "chatcmpl-" + generateRandomID(),
			Object:  "chat.completion",
			Created: getCurrentTimestamp(),
			Model:   req.Model,
			Choices: []ChatChoice{
				{
					Index: 0,
					Message: ChatMessage{
						Role:    "assistant",
						Content: result.Code + "\n\n" + result.Explanation,
					},
					FinishReason: "stop",
				},
			},
		}

		c.JSON(http.StatusOK, response)
	}
}

func generateRandomID() string {
	return "chatcmpl-" + uuid.New().String()
}

func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}
