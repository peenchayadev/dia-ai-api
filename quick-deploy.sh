#!/bin/bash

# Quick deploy script for dia-ai-api
# Usage: ./quick-deploy.sh

set -e

PROJECT_ID="totemic-beaker-475514-i0"
REGION="asia-southeast1"
SERVICE_NAME="dia-ai-api"
REPOSITORY_NAME="dia-ai-api"
IMAGE_NAME="dia-ai-api"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Quick deploying dia-ai-api...${NC}"

# Generate timestamp for unique tag
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:${TIMESTAMP}"
LATEST_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:latest"

echo -e "${BLUE}📦 Building Docker image...${NC}"
docker build --platform linux/amd64 -t $IMAGE_TAG -t $LATEST_TAG ./dia-ai-api/

echo -e "${BLUE}📤 Pushing to Artifact Registry...${NC}"
docker push $IMAGE_TAG
docker push $LATEST_TAG

echo -e "${BLUE}🌐 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image=$LATEST_TAG \
    --region=$REGION \
    --quiet

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}🔗 Service URL: $SERVICE_URL${NC}"
echo -e "${GREEN}📚 API Docs: $SERVICE_URL/docs${NC}"