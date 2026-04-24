#!/usr/bin/env sh
set -eu
HOST="${1:-https://portal.example.com}"
SECRET="${WEBHOOK_SHARED_SECRET:-change-this-webhook-secret}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
BODY='{"eventId":"evt-demo-001","user":{"email":"user@example.com","displayName":"User Example"},"device":{"hostname":"HOST-001"},"policy":{"name":"USB Data Exfiltration","reason":"Copy to removable media blocked"},"artifact":{"type":"file","name":"clientes.xlsx"},"occurredAt":"'"$TIMESTAMP"'"}'
SIGNATURE=$(printf "%s.%s" "$TIMESTAMP" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')

curl -i "$HOST/api/webhooks/endpoint-itm" \
  -H "Content-Type: application/json" \
  -H "x-proofpoint-event-id: evt-demo-001" \
  -H "x-proofpoint-timestamp: $TIMESTAMP" \
  -H "x-proofpoint-signature: sha256=$SIGNATURE" \
  --data "$BODY"
