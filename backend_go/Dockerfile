# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /yolo-backend

# Final stage
FROM alpine:latest
WORKDIR /app

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Copy the Go binary
COPY --from=builder /yolo-backend /yolo-backend

# Note: frontend files are mounted as volume in docker-compose.yml

# Expose port
EXPOSE 3000

# Run
CMD ["/yolo-backend"]