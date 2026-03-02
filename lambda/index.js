/**
 * Nirnay — AWS Lambda Handler
 * Node.js 18.x | HTTP API (API Gateway v2)
 * CommonJS — AWS SDK v3 is built into the Node 18.x runtime (no bundling needed).
 * NOTE: Do NOT upgrade runtime to 20.x without bundling @aws-sdk/* in node_modules.
 *
 * Routes:
 *   GET  /patients         → Fetch all patients (sorted by timestamp desc)
 *   POST /patients         → Save new patient record
 *   PUT  /patients/{id}    → Update patient (status, doctorAdvice)
 *
 * Environment variables:
 *   PATIENTS_TABLE  — DynamoDB table name (default: "nirnay-patients")
 *   ALLOWED_ORIGIN  — CORS origin (default: "*")
 */

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

/* ── DynamoDB client ──────────────────────────────────────── */
const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }),
  { marshallOptions: { removeUndefinedValues: true } }
);

const TABLE  = process.env.PATIENTS_TABLE || 'nirnay-patients';
const ORIGIN = process.env.ALLOWED_ORIGIN  || '*';

/* ── CORS headers ─────────────────────────────────────────── */
const CORS = {
  'Access-Control-Allow-Origin':  ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
};

/* ── Response helpers ─────────────────────────────────────── */
const ok  = (body)       => ({ statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true,  data: body }) });
const created = (body)   => ({ statusCode: 201, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true,  data: body }) });
const badReq  = (msg)    => ({ statusCode: 400, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: msg }) });
const notFound = (msg)   => ({ statusCode: 404, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: msg }) });
const serverErr = (err)  => ({ statusCode: 500, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: err?.message || 'Internal server error' }) });
const preflight = ()     => ({ statusCode: 204, headers: CORS, body: '' });

/* ── Validation helpers ───────────────────────────────────── */
const isValidBP   = (v) => typeof v === 'number' && v >= 40  && v <= 300;
const isValidTemp = (v) => typeof v === 'number' && v >= 90  && v <= 115;
const isValidAge  = (v) => typeof v === 'number' && v >= 0   && v <= 130;

/* ── Risk calculator (mirrors front-end logic) ────────────── */
const calcRisk = (bp, temp) => {
  if (bp > 160 || temp > 102) return 'RED';
  if (bp > 140)               return 'YELLOW';
  return 'GREEN';
};

/* ═══════════════════════════════════════════════════════════
   HANDLER
═══════════════════════════════════════════════════════════ */
exports.handler = async (event) => {
  const method     = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const rawPath    = event.rawPath || event.path || '/';
  const pathParams = event.pathParameters || {};

  /* ── CORS preflight ── */
  if (method === 'OPTIONS') return preflight();

  try {
    /* ─────────────────────────────────────────────────────
       GET /patients  — list all records
    ───────────────────────────────────────────────────── */
    if (method === 'GET' && rawPath.endsWith('/patients')) {
      const result = await dynamo.send(new ScanCommand({ TableName: TABLE }));

      const patients = (result.Items || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(normalise);

      return ok(patients);
    }

    /* ─────────────────────────────────────────────────────
       POST /patients  — create new patient
    ───────────────────────────────────────────────────── */
    if (method === 'POST' && (rawPath.endsWith('/patients') || rawPath.endsWith('/patient'))) {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return badReq('Invalid JSON body');
      }

      const { id, name, age, bloodPressure, temperature, riskLevel } = body;

      // Validations
      if (!id)                         return badReq('Missing required field: id');
      if (!name || typeof name !== 'string') return badReq('Missing or invalid field: name');
      if (!isValidAge(age))            return badReq('Invalid age (0–130 expected)');
      if (!isValidBP(bloodPressure))   return badReq('Invalid blood pressure (40–300 expected)');
      if (!isValidTemp(temperature))   return badReq('Invalid temperature (90–115°F expected)');

      const computedRisk = riskLevel || calcRisk(bloodPressure, temperature);
      const now = new Date().toISOString();

      const item = {
        id,
        name:          name.trim(),
        age,
        bloodPressure,
        temperature,
        riskLevel:     computedRisk,
        status:        'Pending',
        doctorAdvice:  '',
        createdAt:     body.createdAt || now,
        updatedAt:     now,
      };

      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

      console.log(`[nirnay] Patient saved | id=${id} | risk=${computedRisk}`);
      return created(normalise(item));
    }

    /* ─────────────────────────────────────────────────────
       PUT /patients/{id}  — update status / doctor advice
    ───────────────────────────────────────────────────── */
    if (method === 'PUT') {
      const patientId = pathParams.id || rawPath.split('/').pop();
      if (!patientId) return badReq('Missing patient id in path');

      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return badReq('Invalid JSON body');
      }

      const { status, doctorAdvice, reviewedAt } = body;
      const validStatuses = ['Pending', 'Reviewed'];
      if (status && !validStatuses.includes(status)) {
        return badReq(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const now = new Date().toISOString();

      const result = await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key:       { id: patientId },
        UpdateExpression:          'SET #s = :s, doctorAdvice = :a, reviewedAt = :r, updatedAt = :u',
        ExpressionAttributeNames:  { '#s': 'status' },
        ExpressionAttributeValues: {
          ':s': status        || 'Reviewed',
          ':a': doctorAdvice  ?? '',
          ':r': reviewedAt    || now,
          ':u': now,
        },
        ConditionExpression: 'attribute_exists(id)',
        ReturnValues:        'ALL_NEW',
      }));

      console.log(`[nirnay] Patient updated | id=${patientId} | status=${status}`);
      return ok(normalise(result.Attributes || {}));
    }

    /* ─────────────────────────────────────────────────────
       Not found
    ───────────────────────────────────────────────────── */
    return notFound(`Route not found: ${method} ${rawPath}`);

  } catch (err) {
    console.error('[nirnay] Unhandled error:', err);
    // DynamoDB ConditionalCheckFailed → 404
    if (err.name === 'ConditionalCheckFailedException') {
      return notFound('Patient record not found');
    }
    return serverErr(err);
  }
};

/* ── Normalise DynamoDB item → clean API shape ─────────────── */
function normalise(item) {
  return {
    id:           item.id || '',
    name:         item.name || 'Unknown',
    age:          item.age ?? null,
    bloodPressure: item.bloodPressure ?? item.bp ?? null,
    temperature:  item.temperature   ?? item.temp ?? null,
    riskLevel:    item.riskLevel     || 'GREEN',
    status:       item.status        || 'Pending',
    doctorAdvice: item.doctorAdvice  || '',
    createdAt:    item.createdAt     || item.timestamp || null,
    updatedAt:    item.updatedAt     || null,
    reviewedAt:   item.reviewedAt    || null,
  };
}
