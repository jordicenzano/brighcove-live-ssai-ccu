#!/usr/bin/env bash

# Load config
source ../config/config.vars

# Load secrets
source ../secrets/secrets.vars

# Set the env vars for the app engine
rm -f app.yaml

sed "s/{{GCP_DATASET}}/$GCP_DATASET/g;s/{{GCP_TABLE}}/$GCP_TABLE/g;s/{{SHARED_BEACON_SERVER_SIDE_SECRET}}/$SHARED_BEACON_SERVER_SIDE_SECRET/g;" app.yaml.base > app.yaml

# Create the app
gcloud app create --region=$GCP_APP_LOCATION

gcloud app deploy --quiet
