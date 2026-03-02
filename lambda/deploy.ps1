#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────
# deploy.ps1  —  Deploy Nirnay Lambda to AWS
# Usage: cd D:\Hackaton\lambda; .\deploy.ps1
#
# Requirements:
#   - AWS CLI installed  (https://aws.amazon.com/cli/)
#   - AWS credentials configured  (aws configure)
#   - The Lambda function already exists in the console
# ─────────────────────────────────────────────────────────────

$FUNCTION_NAME   = "SavePatientData"
$REGION          = "ap-south-1"
$RUNTIME         = "nodejs18.x"
$HANDLER         = "index.handler"
$ZIP_FILE        = "function.zip"

Write-Host "`n[1/4] Checking AWS CLI..." -ForegroundColor Cyan
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "AWS CLI not found. Install from: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Creating deployment package..." -ForegroundColor Cyan
if (Test-Path $ZIP_FILE) { Remove-Item $ZIP_FILE -Force }

# Zip only index.js (SDK v3 is built into Node 18 runtime)
Compress-Archive -Path "index.js" -DestinationPath $ZIP_FILE -Force
Write-Host "       Created $ZIP_FILE ($([Math]::Round((Get-Item $ZIP_FILE).Length/1KB, 1)) KB)"

Write-Host "[3/4] Updating Lambda function code..." -ForegroundColor Cyan
aws lambda update-function-code `
    --function-name $FUNCTION_NAME `
    --zip-file "fileb://$ZIP_FILE" `
    --region $REGION `
    | ConvertFrom-Json `
    | Select-Object FunctionName, Runtime, LastModified, CodeSize

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nFailed. Make sure:" -ForegroundColor Red
    Write-Host "  1. aws configure has been run with valid credentials"
    Write-Host "  2. FUNCTION_NAME ('$FUNCTION_NAME') matches your Lambda exactly"
    Write-Host "  3. Your IAM user has lambda:UpdateFunctionCode permission"
    exit 1
}

Write-Host "[4/4] Updating runtime and handler (if needed)..." -ForegroundColor Cyan
aws lambda update-function-configuration `
    --function-name $FUNCTION_NAME `
    --runtime $RUNTIME `
    --handler $HANDLER `
    --region $REGION `
    | ConvertFrom-Json `
    | Select-Object FunctionName, Runtime, Handler | Format-List

Write-Host "`n✅  Deployment complete!" -ForegroundColor Green
Write-Host "    CORS headers are now active on all routes (GET/POST/PUT/OPTIONS)."
Write-Host "    Test: https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod/patients`n"
