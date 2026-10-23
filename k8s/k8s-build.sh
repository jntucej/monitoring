#!/bin/bash
# k8s-build.sh - Build and deploy Gate Monitor to Kubernetes
# Usage: ./k8s-build.sh [--push]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="/opt/monitoring/compose"
NAMESPACE="gate-monitor"

echo "🔨 Building Docker images..."
cd "$COMPOSE_DIR"

# Build web image
docker build -t compose-web:latest -f Dockerfile --target runner .
echo "✅ Web image built"

# Build worker image
docker build -t compose-worker:latest -f Dockerfile --target worker .
echo "✅ Worker image built"

if [[ "${1}" == "--push" ]]; then
    REGISTRY="${REGISTRY:-}"
    if [[ -z "$REGISTRY" ]]; then
        echo "ERROR: REGISTRY env var must be set for --push (e.g. ghcr.io/myorg)"
        exit 1
    fi
    echo "📤 Pushing images to $REGISTRY..."
    docker tag compose-web:latest "$REGISTRY/gate-monitor/web:${GIT_SHA:-latest}"
    docker tag compose-worker:latest "$REGISTRY/gate-monitor/worker:${GIT_SHA:-latest}"
    docker push "$REGISTRY/gate-monitor/web:${GIT_SHA:-latest}"
    docker push "$REGISTRY/gate-monitor/worker:${GIT_SHA:-latest}"
    echo "✅ Images pushed"
fi

echo ""
echo "🚀 Deploying to Kubernetes..."
kubectl apply -f "$SCRIPT_DIR/deployment.yaml"
kubectl rollout status deployment/gate-web -n "$NAMESPACE" --timeout=120s
kubectl rollout status deployment/gate-worker -n "$NAMESPACE" --timeout=120s

echo ""
echo "✅ Deployment complete!"
echo "   Access: http://monitor.cej.in"
echo "   Check status: kubectl get pods -n $NAMESPACE"
