#!/bin/bash

# Deploy script for dia-ai-api to Google Cloud Run via Artifact Registry
# Usage: ./deploy.sh [environment] [region]
# Example: ./deploy.sh production asia-southeast1

set -e

# Configuration
PROJECT_ID="totemic-beaker-475514-i0"
SERVICE_NAME="dia-ai-api"
ENVIRONMENT=${1:-production}
REGION=${2:-asia-southeast1}
REPOSITORY_NAME="dia-ai-api"
IMAGE_NAME="dia-ai-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Authenticate with Google Cloud
authenticate() {
    log_info "Authenticating with Google Cloud..."
    
    # Check if already authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        log_warning "Not authenticated with Google Cloud. Please run: gcloud auth login"
        exit 1
    fi
    
    # Set project
    gcloud config set project $PROJECT_ID
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker ${REGION}-docker.pkg.dev
    
    log_success "Authentication completed"
}

# Create Artifact Registry repository if it doesn't exist
setup_artifact_registry() {
    log_info "Setting up Artifact Registry..."
    
    # Check if repository exists
    if ! gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION &> /dev/null; then
        log_info "Creating Artifact Registry repository..."
        gcloud artifacts repositories create $REPOSITORY_NAME \
            --repository-format=docker \
            --location=$REGION \
            --description="Docker repository for dia-ai-api"
    else
        log_info "Artifact Registry repository already exists"
    fi
    
    log_success "Artifact Registry setup completed"
}

# Build and push Docker image
build_and_push() {
    log_info "Building and pushing Docker image..."
    
    # Generate timestamp for image tag
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:${TIMESTAMP}"
    LATEST_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:latest"
    
    # Build image
    log_info "Building Docker image..."
    docker build -t $IMAGE_TAG -t $LATEST_TAG ./dia-ai-api/
    
    # Push image
    log_info "Pushing Docker image to Artifact Registry..."
    docker push $IMAGE_TAG
    docker push $LATEST_TAG
    
    log_success "Docker image built and pushed successfully"
    echo "Image: $IMAGE_TAG"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    # Check if .env file exists
    if [ ! -f "./dia-ai-api/.env" ]; then
        log_error ".env file not found in dia-ai-api directory"
        log_info "Please create .env file with required environment variables"
        exit 1
    fi
    
    # Read environment variables from .env file
    ENV_VARS=""
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ ! -z "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
            # Remove quotes if present
            line=$(echo "$line" | sed 's/^"//' | sed 's/"$//')
            ENV_VARS="$ENV_VARS --set-env-vars $line"
        fi
    done < "./dia-ai-api/.env"
    
    # Deploy to Cloud Run
    gcloud run deploy $SERVICE_NAME \
        --image=$LATEST_TAG \
        --platform=managed \
        --region=$REGION \
        --allow-unauthenticated \
        --port=3001 \
        --memory=1Gi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        --timeout=300 \
        --concurrency=80 \
        $ENV_VARS
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --format="value(status.url)")
    
    log_success "Deployment completed successfully!"
    echo "Service URL: $SERVICE_URL"
}

# Setup health check endpoint (optional)
setup_health_check() {
    log_info "Setting up health check..."
    
    # This is handled by the application itself
    # You can add custom health check logic here if needed
    
    log_success "Health check setup completed"
}

# Main deployment process
main() {
    log_info "Starting deployment process for $SERVICE_NAME to $ENVIRONMENT environment in $REGION region"
    
    # Validate inputs
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
        log_error "Please set your GCP PROJECT_ID in the deploy.sh script"
        exit 1
    fi
    
    # Run deployment steps
    check_dependencies
    authenticate
    setup_artifact_registry
    build_and_push
    deploy_to_cloud_run
    setup_health_check
    
    log_success "🚀 Deployment completed successfully!"
    log_info "Your API is now running at: $SERVICE_URL"
    log_info "You can monitor your service at: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
}

# Run main function
main "$@"