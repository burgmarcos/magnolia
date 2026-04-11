#!/bin/bash
# Magnolia OS: Cloud Testlab Orchestrator
# Automates the creation of a high-performance build server on Google Cloud.

PROJECT_ID="magnolia-os"
ZONE="us-central1-a"
INSTANCE_NAME="magnolia-build-forge"
MACHINE_TYPE="n2-standard-16" # 16 vCPUs, 64GB RAM for fast WebKit synthesis

# ESTIMATED COST (us-central1):
# - On-Demand: ~$0.78 / hour
# - Spot Instance: ~$0.08 - $0.52 / hour
# Note: Spot is recommended for short build tasks to save ~60-90%.

echo "=== Magnolia Cloud Testlab: Deploying Forge ==="

# 1. Create the instance with Nested Virtualization enabled
gcloud compute instances create $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=$MACHINE_TYPE \
    --image-family=ubuntu-2404-lts-amd64 \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=100GB \
    --enable-nested-virtualization \
    --metadata=startup-script="#!/bin/bash
        apt-get update && apt-get install -y docker.io git build-essential
        # Ready for Magnolia Workspace Sync
    "

echo "=== Forge Ready at $INSTANCE_NAME ==="
echo "To sync and build Magnolia OS remotely:"
echo "gcloud compute scp --recursive . $INSTANCE_NAME:~/magnolia-workspace --project=$PROJECT_ID --zone=$ZONE"
echo "gcloud compute ssh $INSTANCE_NAME --project=$PROJECT_ID --zone=$ZONE --command='cd ~/magnolia-workspace && bash scripts/build_full_os.sh'"
