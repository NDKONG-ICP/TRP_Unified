package rag

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type RAGService struct {
	BaseURL string
}

type ContextRequest struct {
	Query string `json:"query"`
	Limit int    `json:"limit,omitempty"`
}

type ContextResponse struct {
	Results []ContextResult `json:"results"`
}

type ContextResult struct {
	Content   string  `json:"content"`
	Source    string  `json:"source"`
	Score     float64 `json:"score"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

func NewRAGService() *RAGService {
	url := os.Getenv("RAG_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8000"
	}
	return &RAGService{BaseURL: url}
}

func (r *RAGService) GetContext(query string, limit int) (*ContextResponse, error) {
	if limit == 0 {
		limit = 5
	}

	reqBody := ContextRequest{
		Query: query,
		Limit: limit,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(
		fmt.Sprintf("%s/api/v1/context", r.BaseURL),
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to call RAG service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("RAG service error: %s", string(body))
	}

	var contextResp ContextResponse
	if err := json.NewDecoder(resp.Body).Decode(&contextResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &contextResp, nil
}
