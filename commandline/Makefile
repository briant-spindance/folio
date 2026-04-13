.PHONY: build prod dev clean test

# Build the binary without embedded frontend (dev mode)
# Use --static flag to point to frontend/dist at runtime
build:
	go build -o folio ./cmd/folio/

# Build the production binary with embedded frontend
# Copies frontend/dist into the build context, embeds it, then cleans up
prod:
	rm -rf cmd/folio/dist
	cp -r ../frontend/dist cmd/folio/dist
	go build -tags embed -o folio ./cmd/folio/
	rm -rf cmd/folio/dist

# Run in dev mode pointing at testdata
dev: build
	./folio web --data ../testdata/folio --static ../frontend/dist

# Run tests
test:
	go test ./... -v

# Clean build artifacts
clean:
	rm -f folio
	rm -rf cmd/folio/dist
