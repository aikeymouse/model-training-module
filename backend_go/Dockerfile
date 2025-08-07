# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY backend_go/go.mod backend_go/go.sum ./
RUN go mod download
COPY backend_go/*.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /yolo-backend

# Final stage
FROM alpine:latest
WORKDIR /app

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Copy the Go binary
COPY --from=builder /yolo-backend /yolo-backend

# Copy frontend files into container
COPY frontend ./frontend

# Expose port
EXPOSE 3000

# Run
CMD ["/yolo-backend"]