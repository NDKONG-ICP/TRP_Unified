FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/server ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/bin/server .

EXPOSE 8080

CMD ["./server"]
