#!/usr/bin/env bash

# Load config
source ../config/config.vars

# Load secrets
source ../secrets/secrets.vars

gcloud beta functions deploy brighcovelive-ccu-api --quiet --runtime nodejs8 --trigger-http --entry-point main --set-env-vars GCP_DATASET=$GCP_DATASET_NAME,GCP_TABLE=$GCP_TABLE_NAME,SHARED_API_SECRET=$SHARED_API_SECRET
