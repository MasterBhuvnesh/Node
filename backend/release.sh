#!/bin/bash

# Release Script for Backend
#
# Bumps the version in package.json, stages it, and prints the
# git commit + tag + push command for you to run.
#
# Usage: bash release.sh backend [patch|minor|major]
# Or via package.json scripts:
#   bun run release          → patch bump
#   bun run release:minor    → minor bump
#   bun run release:major    → major bump
#
# Author: Bhuvnesh Verma

# ── Colors ──
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Args ──
SERVICE_NAME=${1:-backend}
VERSION_TYPE=${2:-patch}

if [[ ! "$SERVICE_NAME" =~ ^(backend)$ ]]; then
    echo -e "${RED}Error: Invalid service name '${SERVICE_NAME}'. Only 'backend' is supported.${NC}"
    exit 1
fi

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid version type '${VERSION_TYPE}'. Use 'patch', 'minor', or 'major'.${NC}"
    exit 1
fi

# ── Confirmation ──
echo -e "${YELLOW}This will bump the '${SERVICE_NAME}' version (${VERSION_TYPE}).${NC}"
read -p "Proceed? (y/n): " -n 1 -r
echo
if [[ ! "$REPLY" =~ ^[yY]$ ]]; then
    echo -e "${RED}Cancelled.${NC}"
    exit 1
fi

# ── Find package.json ──
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
echo -e "${BLUE}Working directory: ${SCRIPT_DIR}${NC}"

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    echo -e "${RED}Error: package.json not found in ${SCRIPT_DIR}${NC}"
    exit 1
fi

cd "$SCRIPT_DIR" || exit 1

# ── Bump version ──
echo -e "${YELLOW}Bumping ${VERSION_TYPE} version...${NC}"
npm version "$VERSION_TYPE" --no-git-tag-version

VERSION=$(grep -oP '"version": "\K[^"]+' package.json)
echo -e "${GREEN}New version: ${VERSION}${NC}"

# ── Stage files ──
git add package.json

# ── Print the command to run ──
echo ""
echo -e "${YELLOW}Done! Run this to commit, tag, and push:${NC}"
echo ""
echo -e "${GREEN}git commit -m \"chore(${SERVICE_NAME}): bump version to v${VERSION}\" && git tag -a \"${SERVICE_NAME}-v${VERSION}\" -m \"Release ${SERVICE_NAME} v${VERSION}\" && git push origin HEAD --tags${NC}"
echo ""
