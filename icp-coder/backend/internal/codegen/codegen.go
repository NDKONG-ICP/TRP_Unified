package codegen

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type LLMProvider string

const (
	ProviderGemini LLMProvider = "gemini"
	ProviderOpenAI LLMProvider = "openai"
	ProviderClaude LLMProvider = "claude"
)

type CodeGenService struct {
	Provider LLMProvider
	APIKey   string
}

type GenerateRequest struct {
	Prompt      string  `json:"prompt"`
	Context     string  `json:"context,omitempty"`
	Temperature float64 `json:"temperature,omitempty"`
	MaxTokens   int     `json:"max_tokens,omitempty"`
}

type GenerateResponse struct {
	Code        string `json:"code"`
	Explanation string `json:"explanation,omitempty"`
}

func NewCodeGenService() (*CodeGenService, error) {
	// Check which provider is configured
	if apiKey := os.Getenv("GEMINI_API_KEY"); apiKey != "" {
		return &CodeGenService{
			Provider: ProviderGemini,
			APIKey:   apiKey,
		}, nil
	}
	if apiKey := os.Getenv("OPENAI_API_KEY"); apiKey != "" {
		return &CodeGenService{
			Provider: ProviderOpenAI,
			APIKey:   apiKey,
		}, nil
	}
	if apiKey := os.Getenv("CLAUDE_API_KEY"); apiKey != "" {
		return &CodeGenService{
			Provider: ProviderClaude,
			APIKey:   apiKey,
		}, nil
	}

	return nil, fmt.Errorf("no LLM provider API key configured")
}

func (c *CodeGenService) GenerateCode(req GenerateRequest) (*GenerateResponse, error) {
	switch c.Provider {
	case ProviderGemini:
		return c.generateWithGemini(req)
	case ProviderOpenAI:
		return c.generateWithOpenAI(req)
	case ProviderClaude:
		return c.generateWithClaude(req)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", c.Provider)
	}
}

func (c *CodeGenService) generateWithGemini(req GenerateRequest) (*GenerateResponse, error) {
	prompt := buildGeminiPrompt(req.Prompt, req.Context)
	
	geminiReq := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature": req.Temperature,
			"maxOutputTokens": req.MaxTokens,
		},
	}

	jsonData, _ := json.Marshal(geminiReq)
	httpReq, _ := http.NewRequest(
		"POST",
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key="+c.APIKey,
		bytes.NewBuffer(jsonData),
	)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini API error: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini API error: %s", string(body))
	}

	var geminiResp map[string]interface{}
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	candidates, ok := geminiResp["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	candidate, ok := candidates[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid candidate format")
	}

	content, ok := candidate["content"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid content format")
	}

	parts, ok := content["parts"].([]interface{})
	if !ok || len(parts) == 0 {
		return nil, fmt.Errorf("no parts in response")
	}

	part, ok := parts[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid part format")
	}

	text, ok := part["text"].(string)
	if !ok {
		return nil, fmt.Errorf("text not found in response")
	}

	return &GenerateResponse{
		Code: extractCodeBlock(text),
		Explanation: text,
	}, nil
}

func (c *CodeGenService) generateWithOpenAI(req GenerateRequest) (*GenerateResponse, error) {
	prompt := buildOpenAIPrompt(req.Prompt, req.Context)
	
	openaiReq := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]interface{}{
			{"role": "user", "content": prompt},
		},
		"temperature": req.Temperature,
		"max_tokens": req.MaxTokens,
	}

	jsonData, _ := json.Marshal(openaiReq)
	httpReq, _ := http.NewRequest(
		"POST",
		"https://api.openai.com/v1/chat/completions",
		bytes.NewBuffer(jsonData),
	)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.APIKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("openai API error: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai API error: %s", string(body))
	}

	var openaiResp map[string]interface{}
	if err := json.Unmarshal(body, &openaiResp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	choices, ok := openaiResp["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	choice, ok := choices[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid choice format")
	}

	message, ok := choice["message"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid message format")
	}

	text, ok := message["content"].(string)
	if !ok {
		return nil, fmt.Errorf("content not found in response")
	}

	return &GenerateResponse{
		Code: extractCodeBlock(text),
		Explanation: text,
	}, nil
}

func (c *CodeGenService) generateWithClaude(req GenerateRequest) (*GenerateResponse, error) {
	prompt := buildClaudePrompt(req.Prompt, req.Context)
	
	claudeReq := map[string]interface{}{
		"model": "claude-3-5-sonnet-20241022",
		"max_tokens": req.MaxTokens,
		"temperature": req.Temperature,
		"messages": []map[string]interface{}{
			{"role": "user", "content": prompt},
		},
	}

	jsonData, _ := json.Marshal(claudeReq)
	httpReq, _ := http.NewRequest(
		"POST",
		"https://api.anthropic.com/v1/messages",
		bytes.NewBuffer(jsonData),
	)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.APIKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("claude API error: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("claude API error: %s", string(body))
	}

	var claudeResp map[string]interface{}
	if err := json.Unmarshal(body, &claudeResp); err != nil {
		return nil, fmt.Errorf("failed to parse Claude response: %w", err)
	}

	content, ok := claudeResp["content"].([]interface{})
	if !ok || len(content) == 0 {
		return nil, fmt.Errorf("no response from Claude")
	}

	contentItem, ok := content[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid content format")
	}

	text, ok := contentItem["text"].(string)
	if !ok {
		return nil, fmt.Errorf("text not found in response")
	}

	return &GenerateResponse{
		Code: extractCodeBlock(text),
		Explanation: text,
	}, nil
}

func buildGeminiPrompt(prompt, context string) string {
	if context == "" {
		return fmt.Sprintf("Generate Motoko code for the following request:\n\n%s\n\nProvide complete, working Motoko code.", prompt)
	}
	return fmt.Sprintf("Context from Motoko documentation:\n\n%s\n\nGenerate Motoko code for the following request:\n\n%s\n\nProvide complete, working Motoko code based on the context.", context, prompt)
}

func buildOpenAIPrompt(prompt, context string) string {
	if context == "" {
		return fmt.Sprintf("Generate Motoko code for the following request:\n\n%s\n\nProvide complete, working Motoko code.", prompt)
	}
	return fmt.Sprintf("Context from Motoko documentation:\n\n%s\n\nGenerate Motoko code for the following request:\n\n%s\n\nProvide complete, working Motoko code based on the context.", context, prompt)
}

func buildClaudePrompt(prompt, context string) string {
	if context == "" {
		return fmt.Sprintf("Generate Motoko code for the following request:\n\n%s\n\nProvide complete, working Motoko code.", prompt)
	}
	return fmt.Sprintf("Context from Motoko documentation:\n\n%s\n\nGenerate Motoko code for the following request:\n\n%s\n\nProvide complete, working Motoko code based on the context.", context, prompt)
}

func extractCodeBlock(text string) string {
	// Extract code from markdown code blocks
	start := 0
	end := len(text)
	
	if idx := bytes.Index([]byte(text), []byte("```motoko")); idx != -1 {
		start = idx + 9 // Length of "```motoko"
	} else if idx := bytes.Index([]byte(text), []byte("```")); idx != -1 {
		start = idx + 3
	}
	
	if idx := bytes.LastIndex([]byte(text), []byte("```")); idx != -1 && idx > start {
		end = idx
	}
	
	code := text[start:end]
	return string(bytes.TrimSpace([]byte(code)))
}
