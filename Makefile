include .devcontainer/Makefile

.PHONY: firefox.zip

firefox.zip:
	$(eval VERSION := $(shell grep '"version"' firefox/manifest.json | sed 's/.*: *"\(.*\)".*/\1/'))
	cd firefox && zip -r ../account-switcher-$(VERSION).zip .
