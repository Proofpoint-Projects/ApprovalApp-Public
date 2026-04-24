#!/usr/bin/env sh
set -eu
mkdir -p ./secrets
printf '{"v1":"%s"}\n' "$(openssl rand -base64 32 | tr -d '\n')" > ./secrets/app_master_keys.json
echo "Arquivo criado em ./secrets/app_master_keys.json"
