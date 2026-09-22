#!/bin/bash
# usage: ./ios-build.sh consumer|contractor   (builds a store/TestFlight iOS binary with local Apple credentials)
set -e; V=${1:-consumer}; cd "$(dirname "$0")"
read -s -p "p12 password: " PW; echo
cat > credentials.json <<JSON
{ "ios": { "provisioningProfilePath": "credentials/$V.mobileprovision", "distributionCertificate": { "path": "credentials/mrbuilder-dist.p12", "password": "$PW" } } }
JSON
eas build --profile $V --platform ios --non-interactive; rm -f credentials.json
