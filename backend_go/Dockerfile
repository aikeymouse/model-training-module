# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /yolo-backend

# Final stage
FROM alpine:latest
WORKDIR /app

# Install Docker CLI
RUN apk add --no-cache docker-cli

COPY --from=builder /yolo-backend /yolo-backend

# Expose port
EXPOSE 8080

# Run
CMD ["/yolo-backend"]