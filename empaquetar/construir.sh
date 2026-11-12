#!/bin/sh
# Empaqueta el curso en dos ejecutables, en ../ejecutables. Uso: sh empaquetar/construir.sh [versión]
set -e
V="${1:-v1}"; cd "$(dirname "$0")/.."
rm -rf empaquetar/sitio; mkdir -p empaquetar/sitio ejecutables
cp index.html concepto.html horizonte.html favicon.svg empaquetar/sitio/
cp -r css motor nucleo contenido vendor empaquetar/sitio/
cd empaquetar
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o "../ejecutables/Penumbra-$V-linux" .
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o "../ejecutables/Penumbra-$V-windows.exe" .
ls -la ../ejecutables
