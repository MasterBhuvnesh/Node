#!/bin/bash
# ============================================================
# Tear down everything from Minikube
# Usage: bash k8s/destroy.sh
# ============================================================

echo "This will delete ALL resources in the node-app namespace."
read -p "Are you sure? (y/N): " confirm
if [ "$confirm" != "y" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "=== Deleting namespace (removes everything inside it) ==="
kubectl delete namespace node-app

echo ""
echo "Done. All resources deleted."
