#!/usr/bin/env bash

# Load config
source ../config/config.vars

# Load secrets
source ../secrets/secrets.vars

gcloud beta functions deploy $GCP_CLOUD_FUNCTION_DATA_AGGR_CURRENT_NAME --quiet --runtime nodejs8 --trigger-http --entry-point main --set-env-vars GCP_DATASET=$GCP_DATASET,GCP_TABLE=$GCP_TABLE,SHARED_INTERNAL_SECRET=$SHARED_INTERNAL_SECRET,GCP_DS_KIND=$GCP_DS_KIND,MAX_BEACON_DELAY_S=$MAX_BEACON_DELAY_S,CCU_AGGREGATION_PERIOD_MS=$CCU_AGGREGATION_PERIOD_MS
