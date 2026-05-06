#!/bin/bash
# ============================================================
# Deploy everything to Minikube
# Usage: bash k8s/deploy.sh
# ============================================================

set -e

echo "=== 1. Creating namespace ==="
kubectl apply -f k8s/namespace.yml

echo ""
echo "=== 2. Deploying PostgreSQL ==="
kubectl apply -f k8s/postgres/

echo ""
echo "=== 3. Waiting for PostgreSQL to be ready ==="
kubectl wait --namespace node-app \
  --for=condition=ready pod \
  -l app=postgres \
  --timeout=60s

echo ""
echo "=== 4. Deploying monitoring stack ==="
kubectl apply -f k8s/monitoring/loki/
kubectl apply -f k8s/monitoring/prometheus/
kubectl apply -f k8s/monitoring/grafana/

echo ""
echo "=== 5. Deploying backend ==="
kubectl apply -f k8s/backend/

echo ""
echo "=== 6. Waiting for backend to be ready ==="
kubectl wait --namespace node-app \
  --for=condition=ready pod \
  -l app=backend \
  --timeout=120s

echo ""
echo "=== 7. Enabling metrics-server for HPA ==="
minikube addons enable metrics-server 2>/dev/null || true

MINIKUBE_IP=$(minikube ip)
echo ""
echo "============================================================"
echo "  Deployment complete!"
echo "============================================================"
echo ""
echo "  Backend API:   http://${MINIKUBE_IP}:30080"
echo "  Prometheus:    http://${MINIKUBE_IP}:30090"
echo "  Grafana:       http://${MINIKUBE_IP}:30030  (admin/admin)"
echo ""
echo "  NOTE (Docker driver on Windows/macOS):"
echo "    The Minikube IP above may NOT be reachable directly."
echo "    Use one of these methods to access services:"
echo ""
echo "    Option A — tunnel all services at once (run in a separate terminal):"
echo "      minikube tunnel"
echo "      Then access: http://localhost:30080, :30090, :30030"
echo ""
echo "    Option B — tunnel a single service:"
echo "      minikube service backend-svc -n node-app"
echo "      minikube service prometheus-svc -n node-app"
echo "      minikube service grafana-svc -n node-app"
echo ""
echo "  Useful commands:"
echo "    kubectl get pods -n node-app              # see all pods"
echo "    kubectl get svc -n node-app               # see all services"
echo "    kubectl logs -f -l app=backend -n node-app # tail backend logs"
echo "    kubectl get hpa -n node-app                # check autoscaler"
echo "    kubectl top pods -n node-app               # resource usage"
echo ""
echo "  Push schema to database:"
echo "    kubectl exec -it deploy/backend -n node-app -- bunx prisma db push"
echo ""
echo "  Update backend image:"
echo "    kubectl set image deploy/backend backend=verma2904/node-backend:v1.0.7 -n node-app"
echo "============================================================"
