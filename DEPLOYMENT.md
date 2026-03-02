# Nirnay — Deployment Guide

## Architecture Overview

```
Browser / Mobile App
        │
        ▼
   Vercel (Frontend)
   expo export -p web → dist/
        │
        ▼
 AWS API Gateway (REST)
 https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod
        │
        ▼
   AWS Lambda (index.js)
        │
        ▼
   AWS DynamoDB
```

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| npm | ≥ 9 | bundled with Node |
| Expo CLI | latest | `npm i -g expo-cli` |
| Git | any | https://git-scm.com |
| AWS CLI | v2 | https://aws.amazon.com/cli |
| Vercel CLI | latest | `npm i -g vercel` |

---

## 2. Environment Details

| Key | Value |
|---|---|
| **Frontend Host** | Vercel |
| **Backend Host** | AWS Lambda + API Gateway |
| **API Base URL** | `https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod` |
| **Patients Endpoint** | `GET / POST /patients` |
| **Update Endpoint** | `PUT /patients/{id}` |
| **Database** | AWS DynamoDB |
| **Local CORS Proxy** | `http://localhost:8083` (dev only, `node proxy.js`) |

---

## 3. Local Development Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd nirnay

# 2. Install dependencies
npm install

# 3. Start the CORS proxy (required for web PUT requests in dev)
node proxy.js
# → Proxy running on http://localhost:8083

# 4. In a separate terminal, start the Expo dev server
npm run web
# → App running on http://localhost:8081
```

> In development (`__DEV__ === true`), all API calls are automatically routed through
> `proxy.js` on port 8083 to avoid CORS preflight issues with AWS API Gateway.
> In production, all calls go directly to the AWS endpoint.

---

## 4. Deploy Frontend to Vercel

### Option A — Vercel CLI (recommended)

```bash
# 1. Build the web export
npm run build
# Output: dist/

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod
```

### Option B — GitHub Auto-Deploy

1. Push your code to GitHub
   ```bash
   git add .
   git commit -m "chore: prepare for production"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repository
4. Vercel will auto-detect `vercel.json` with these settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**

### vercel.json Summary

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

> The SPA rewrite ensures deep links (e.g. `/patients/123`) are handled by the React app.

---

## 5. Deploy Backend to AWS Lambda

```bash
# Navigate to lambda folder
cd lambda

# Install Lambda dependencies (if any)
npm install

# Zip and deploy using the provided script
./deploy.ps1
```

Or manually via AWS Console:
1. Go to **AWS Lambda** → your function
2. Upload `lambda/index.js` as a `.zip`
3. Set handler to `index.handler`
4. Set runtime to **Node.js 18.x**

---

## 6. Configure CORS on AWS API Gateway

After deploying to Vercel you will have a URL like `https://nirnay.vercel.app`.
Add it to API Gateway allowed origins:

1. Open **API Gateway** → your API → **Resources**
2. Select each resource (`/patients`, `/patients/{id}`)
3. Click **Actions → Enable CORS**
4. Set **Access-Control-Allow-Origin** to your Vercel URL (or `*` for open access)
5. Click **Enable CORS and replace existing CORS headers**
6. **Deploy the API** to the `prod` stage

---

## 7. API Reference

### GET /patients
Fetch all patient records.
```
GET https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod/patients
```

### POST /patients
Submit a new patient record.
```
POST https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod/patients
Content-Type: application/json

{
  "name": "Ramesh Kumar",
  "age": 45,
  "bloodPressure": "140/90",
  "temperature": 38.5,
  "riskLevel": "YELLOW"
}
```

### PUT /patients/{id}
Update an existing patient record.
```
PUT https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod/patients/P-001
Content-Type: application/json

{
  "riskLevel": "RED",
  "bloodPressure": "160/100"
}
```

---

## 8. Pre-Deployment Checklist

- [ ] `npm install` completes without errors
- [ ] `npm run build` produces a `dist/` folder without errors
- [ ] `dist/index.html` exists
- [ ] No hardcoded `localhost` URLs in any service file
- [ ] `utils/constants.js` — `_realBase` points to the correct AWS URL
- [ ] AWS Lambda is deployed and the `/patients` endpoint returns `200`
- [ ] CORS is configured on API Gateway for the Vercel domain
- [ ] `vercel.json` is committed and at the project root
- [ ] Repository is pushed to GitHub (`git push origin main`)
- [ ] Vercel project is linked to the correct GitHub repo/branch

---

## 9. Post-Deployment Verification

```bash
# Check GET patients returns data
curl https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod/patients

# Check POST creates a record
curl -X POST https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod/patients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","age":30,"riskLevel":"GREEN"}'
```

Open your Vercel URL and confirm:
- Dashboard loads patient data
- Risk badges display correctly
- Adding a new patient syncs to DynamoDB

---

## 10. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| CORS error in browser | API Gateway missing CORS headers | Re-run "Enable CORS" on API Gateway |
| `dist/` not found after build | Build failed silently | Run `npm run build` and check console |
| Patients not loading on Vercel | Wrong API URL | Check `_realBase` in `constants.js` |
| PUT blocked in dev | Proxy not running | Run `node proxy.js` in a separate terminal |
| Lambda returns 500 | DynamoDB permissions | Add `AmazonDynamoDBFullAccess` to Lambda role |
| Vercel build fails | Missing dependency | Run `npm install` and push `package-lock.json` |
