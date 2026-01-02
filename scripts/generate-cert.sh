#!/bin/bash

# Generate self-signed SSL certificate for local development
# This allows iOS devices to connect over HTTPS

CERT_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERT_DIR"

echo "Generating self-signed certificate for local HTTPS..."

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0)
else
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

echo "Local IP detected: $LOCAL_IP"

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" -sha256 -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=PartyGame/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$LOCAL_IP"

echo ""
echo "✅ Certificate generated at: $CERT_DIR"
echo ""
echo "📱 To use on iOS devices:"
echo "1. Open https://$LOCAL_IP:3000/display in Safari"
echo "2. Tap 'Show Details' → 'Visit this website'"
echo "3. Or: Transfer cert.pem to your iOS device and install it in Settings"
echo ""
echo "🔒 For better security, install the certificate:"
echo "   Settings → General → VPN & Device Management → Install Profile"
echo ""
