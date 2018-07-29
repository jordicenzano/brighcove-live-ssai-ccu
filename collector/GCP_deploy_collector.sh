#!/usr/bin/env bash

# Load config
source ../config/config.vars

# Load secrets
source ../secrets/secrets.vars

# Set the env vars for the app engine
rm -f app.yaml

sed "s/{{GCP_DATASET_NAME}}/$GCP_DATASET_NAME/g;s/{{GCP_TABLE_NAME}}/$GCP_TABLE_NAME/g;" app.yaml.base > app.yaml

# Create the app
gcloud app create --region=$GCP_APP_LOCATION

gcloud app deploy --quiet
