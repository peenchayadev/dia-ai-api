# Dia AI API Deployment Guide

คู่มือการ deploy dia-ai-api ไป Google Cloud Run ผ่าน Artifact Registry

## Prerequisites

### 1. ติดตั้ง Tools ที่จำเป็น

```bash
# ติดตั้ง Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# ติดตั้ง Docker
# สำหรับ macOS
brew install docker

# หรือดาวน์โหลดจาก https://www.docker.com/products/docker-desktop
```

### 2. Setup Google Cloud Project

```bash
# Login เข้า Google Cloud
gcloud auth login

# Set project เป็น default (ใช้ project ที่มีอยู่แล้ว)
gcloud config set project totemic-beaker-475514-i0

# Enable APIs ที่จำเป็น (ถ้ายังไม่ได้ enable)
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 3. เตรียม Environment Variables

สร้างไฟล์ `.env` ใน `dia-ai-api/` directory:

```bash
cp dia-ai-api/.env.example dia-ai-api/.env
```

แก้ไขค่าใน `.env` ให้ถูกต้อง:

```env
DATABASE_URL="your-database-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
GEMINI_API_KEY="your-gemini-api-key"
LINE_CHANNEL_ACCESS_TOKEN="your-line-token"
PORT=3001
```

## การ Deploy

### วิธีที่ 1: ใช้ Auto Deploy Script (แนะนำ)

#### 1. ตรวจสอบ deploy.sh

```bash
# ตรวจสอบว่า PROJECT_ID ถูกต้องแล้ว
grep "PROJECT_ID=" deploy.sh

# ควรจะเห็น: PROJECT_ID="totemic-beaker-475514-10"
```

#### 2. ทำให้ script executable

```bash
chmod +x deploy.sh
```

#### 3. รัน deploy script

```bash
# Deploy ไป production environment ใน asia-southeast1
./deploy.sh production asia-southeast1

# หรือใช้ค่า default
./deploy.sh
```

### วิธีที่ 2: Manual Deploy (ทีละขั้นตอน)

#### 1. Build Docker Image

```bash
# เข้าไปใน directory ของ API
cd dia-ai-api

# Build Docker image
docker build -t dia-ai-api:latest .

# Test รัน local (optional)
docker run -p 3001:3001 --env-file .env dia-ai-api:latest
```

#### 2. Setup Artifact Registry

```bash
# Repository มีอยู่แล้ว (dia-ai-api) ใน asia-southeast1
# แค่ configure Docker authentication
gcloud auth configure-docker asia-southeast1-docker.pkg.dev
```

#### 3. Tag และ Push Image

```bash
# Tag image สำหรับ Artifact Registry
docker tag dia-ai-api:latest \
    asia-southeast1-docker.pkg.dev/totemic-beaker-475514-i0/dia-ai-api/dia-ai-api:latest

# Push image
docker push asia-southeast1-docker.pkg.dev/totemic-beaker-475514-i0/dia-ai-api/dia-ai-api:latest
```

#### 4. Deploy ไป Cloud Run

```bash
# Deploy service
gcloud run deploy dia-ai-api \
    --image=asia-southeast1-docker.pkg.dev/totemic-beaker-475514-i0/dia-ai-api/dia-ai-api:latest \
    --platform=managed \
    --region=asia-southeast1 \
    --allow-unauthenticated \
    --port=3001 \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --timeout=300 \
    --concurrency=80 \
    --set-env-vars="DATABASE_URL=your-database-url,SUPABASE_ANON_KEY=your-key,SUPABASE_URL=your-url,SUPABASE_SERVICE_ROLE_KEY=your-service-key,GEMINI_API_KEY=your-gemini-key,LINE_CHANNEL_ACCESS_TOKEN=your-line-token,PORT=3001"
```

## การ Test Local ด้วย Docker Compose

### 1. รัน Local Development

```bash
# รัน services ทั้งหมด
docker-compose up -d

# ดู logs
docker-compose logs -f dia-ai-api

# Stop services
docker-compose down
```

### 2. Test API

```bash
# Test health check
curl http://localhost:3001/health

# Test API endpoint
curl http://localhost:3001/api/your-endpoint
```

## การจัดการ Environment Variables

### 1. ใช้ Secret Manager (แนะนำสำหรับ Production)

```bash
# สร้าง secrets
echo -n "your-database-url" | gcloud secrets create database-url --data-file=-
echo -n "your-gemini-key" | gcloud secrets create gemini-api-key --data-file=-

# Deploy พร้อม secrets
gcloud run deploy dia-ai-api \
    --image=asia-southeast1-docker.pkg.dev/your-project-id/dia-ai-repo/dia-ai-api:latest \
    --set-secrets="DATABASE_URL=database-url:latest,GEMINI_API_KEY=gemini-api-key:latest" \
    --region=asia-southeast1
```

### 2. ใช้ .env file (สำหรับ Development)

```bash
# สร้าง .env file
cat > dia-ai-api/.env << EOF
DATABASE_URL="your-database-url"
SUPABASE_ANON_KEY="your-key"
SUPABASE_URL="your-url"
GEMINI_API_KEY="your-key"
LINE_CHANNEL_ACCESS_TOKEN="your-token"
PORT=3001
EOF
```

## Monitoring และ Debugging

### 1. ดู Logs

```bash
# ดู logs ของ Cloud Run service
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=dia-ai-api" --limit=50 --format=json

# หรือใช้ Console
# https://console.cloud.google.com/run/detail/asia-southeast1/dia-ai-api
```

### 2. ตรวจสอบ Service Status

```bash
# ดูข้อมูล service
gcloud run services describe dia-ai-api --region=asia-southeast1

# ดู URL ของ service
gcloud run services describe dia-ai-api --region=asia-southeast1 --format="value(status.url)"
```

### 3. Update Service

```bash
# Update environment variables
gcloud run services update dia-ai-api \
    --region=asia-southeast1 \
    --set-env-vars="NEW_VAR=new-value"

# Update image
gcloud run services update dia-ai-api \
    --region=asia-southeast1 \
    --image=asia-southeast1-docker.pkg.dev/your-project-id/dia-ai-repo/dia-ai-api:new-tag
```

## CI/CD Pipeline (Optional)

### 1. GitHub Actions

สร้างไฟล์ `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'
    
    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'
    
    - name: 'Configure Docker'
      run: gcloud auth configure-docker asia-southeast1-docker.pkg.dev
    
    - name: 'Build and Push'
      run: |
        docker build -t asia-southeast1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/dia-ai-repo/dia-ai-api:${{ github.sha }} ./dia-ai-api/
        docker push asia-southeast1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/dia-ai-repo/dia-ai-api:${{ github.sha }}
    
    - name: 'Deploy to Cloud Run'
      run: |
        gcloud run deploy dia-ai-api \
          --image=asia-southeast1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/dia-ai-repo/dia-ai-api:${{ github.sha }} \
          --region=asia-southeast1 \
          --platform=managed \
          --allow-unauthenticated
```

## Troubleshooting

### 1. Docker Build Issues

```bash
# ลบ cache และ build ใหม่
docker system prune -a
docker build --no-cache -t dia-ai-api:latest ./dia-ai-api/
```

### 2. Authentication Issues

```bash
# Re-authenticate
gcloud auth login
gcloud auth configure-docker asia-southeast1-docker.pkg.dev
```

### 3. Permission Issues

```bash
# ตรวจสอบ IAM roles
gcloud projects get-iam-policy your-project-id

# เพิ่ม roles ที่จำเป็น
gcloud projects add-iam-policy-binding your-project-id \
    --member="user:your-email@gmail.com" \
    --role="roles/run.admin"
```

### 4. Service Not Starting

```bash
# ตรวจสอบ logs
gcloud logging read "resource.type=cloud_run_revision" --limit=10

# ตรวจสอบ environment variables
gcloud run services describe dia-ai-api --region=asia-southeast1 --format="export"
```

## Best Practices

1. **Security**: ใช้ Secret Manager สำหรับ sensitive data
2. **Monitoring**: ตั้ง alerting สำหรับ errors และ performance
3. **Versioning**: ใช้ image tags ที่มี version number
4. **Resource Limits**: ตั้ง memory และ CPU limits ให้เหมาะสม
5. **Health Checks**: implement health check endpoint ใน API
6. **Logging**: ใช้ structured logging สำหรับ debugging

## Cost Optimization

1. ตั้ง `--min-instances=0` เพื่อ scale to zero
2. ใช้ `--concurrency` ที่เหมาะสมกับ workload
3. Monitor usage ผ่าน Cloud Console
4. ใช้ `--cpu-throttling` สำหรับ workload ที่ไม่ต้องการ CPU สูง

---

หากมีปัญหาหรือข้อสงสัย สามารถดู logs หรือติดต่อทีม DevOps ได้เลย! 🚀