.PHONY: run build lint lint-fix

run:
	wails dev

build:
	wails build

lint:
	golangci-lint run ./...

lint-fix:
	golangci-lint run --fix ./...
