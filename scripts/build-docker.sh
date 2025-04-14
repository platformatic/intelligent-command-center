#!/bin/bash

# Exit on error
set -e

# Set environment variables
export DOCKER_BUILDKIT=1
export REPOSITORY_NAME="icc"

# Parse command line arguments
DEMO_MODE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --demo) DEMO_MODE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Get Git information
export ICC_COMMIT_HASH=$(git rev-parse HEAD)
export ICC_COMMIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
export ICC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Replace forward slashes with underscores in branch name for Docker tag
export DOCKER_BRANCH_TAG=$(echo "${ICC_COMMIT_BRANCH}" | tr '/' '_')
export DOCKER_IMAGE_TAG="platformatic/plt-${REPOSITORY_NAME}:${DOCKER_BRANCH_TAG}"

echo "Building Docker image ${DOCKER_IMAGE_TAG}..."

# Set Docker tag based on branch
if [ "${ICC_COMMIT_BRANCH}" = "main" ]; then
  DOCKER_TAG="latest"
else
  DOCKER_TAG="${DOCKER_BRANCH_TAG}"
fi

# Determine system architecture
ARCH=$(uname -m)
case $ARCH in
  x86_64)
    PLATFORM="linux/amd64"
    ;;
  aarch64|arm64)
    PLATFORM="linux/arm64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

echo "Building for platform: $PLATFORM"

# Build the Docker image
docker build \
  --platform ${PLATFORM} \
  --tag ${DOCKER_IMAGE_TAG} \
  --secret=id=npmrc,src=${HOME}/.npmrc \
  --build-arg ICC_BUILD_TIME=${ICC_BUILD_TIME} \
  --build-arg ICC_COMMIT_HASH=${ICC_COMMIT_HASH} \
  --build-arg ICC_COMMIT_BRANCH=${ICC_COMMIT_BRANCH} \
  ${DEMO_MODE:+--build-arg DEMO_LOGIN=DEMO} \
  .

# Calculate the maximum width needed
MAX_WIDTH=0
for var in "Build time: ${ICC_BUILD_TIME}" "Commit hash: ${ICC_COMMIT_HASH}" "Branch: ${ICC_COMMIT_BRANCH}" "Docker image: ${DOCKER_IMAGE_TAG}" "Platform: ${PLATFORM}"; do
  width=${#var}
  if [ $width -gt $MAX_WIDTH ]; then
    MAX_WIDTH=$width
  fi
done

# Add padding for the frame
MAX_WIDTH=$((MAX_WIDTH + 4))

# Print summary in a nice frame
echo
printf "┌%${MAX_WIDTH}s┐\n" | tr ' ' '─'
printf "│%${MAX_WIDTH}s│\n" "$(printf " Build Summary%*s" $((MAX_WIDTH-14)) "" | tr ' ' ' ')"
printf "├%${MAX_WIDTH}s┤\n" | tr ' ' '─'
printf "│ Build time: %-*s│\n" $((MAX_WIDTH-13)) "${ICC_BUILD_TIME}"
printf "│ Commit hash: %-*s│\n" $((MAX_WIDTH-14)) "${ICC_COMMIT_HASH}"
printf "│ Branch: %-*s│\n" $((MAX_WIDTH-9)) "${ICC_COMMIT_BRANCH}"
printf "│ Docker image: %-*s│\n" $((MAX_WIDTH-15)) "${DOCKER_IMAGE_TAG}"
printf "│ Platform: %-*s│\n" $((MAX_WIDTH-11)) "${PLATFORM}"
printf "└%${MAX_WIDTH}s┘\n" | tr ' ' '─'
echo

