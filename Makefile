include .devcontainer/Makefile

.PHONY: firefox.zip

firefox.zip:
	$(eval VERSION := $(shell grep '"version"' firefox/manifest.json | sed 's/.*: *"\(.*\)".*/\1/'))
	mkdir -p dist
	cd firefox && zip -r ../dist/account-switcher-firefox-$(VERSION).zip .
