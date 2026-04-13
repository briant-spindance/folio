.PHONY: build prod dev clean test

# Build the binary without embedded frontend (dev mode)
# Use --static flag to point to frontend/dist at runtime
build:
	go build -o forge ./cmd/forge/

# Build the production binary with embedded frontend
# Copies frontend/dist into the build context, embeds it, then cleans up
prod:
	rm -rf cmd/forge/dist
	cp -r ../frontend/dist cmd/forge/dist
	go build -tags embed -o forge ./cmd/forge/
	rm -rf cmd/forge/dist

# Run in dev mode pointing at testdata
dev: build
	./forge web --data ../testdata/forge --static ../frontend/dist

# Run tests
test:
	go test ./... -v

# Clean build artifacts
clean:
	rm -f forge
	rm -rf cmd/forge/dist
