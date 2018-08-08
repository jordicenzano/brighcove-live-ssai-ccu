#!/usr/bin/env bash

# Load config
source ../config/config.vars

# Load secrets
source ../secrets/secrets.vars

# Set the env vars for the app engine
rm -f app.yaml

#Get URL to fire
URL_RAW_DATA_AGGR=`gcloud functions describe $GCP_CLOUD_FUNCTION_DATA_AGGR_CURRENT_NAME --flatten "httpsTrigger:url" --format config`
URL_RAW_DATA_EXP=`gcloud functions describe $GCP_CLOUD_FUNCTION_DATA_EXP_CURRENT_NAME --flatten "httpsTrigger:url" --format config`

# Build the URL to fire
URL_TO_FIRE_RAW_DATA_AGGR="${URL_RAW_DATA_AGGR/url = /}"
URL_TO_FIRE_RAW_DATA_EXP="${URL_RAW_DATA_EXP/url = /}"

echo "URL_TO_FIRE_RAW_DATA_AGGR: $URL_TO_FIRE_RAW_DATA_AGGR"

echo "URL_TO_FIRE_RAW_DATA_EXP: $URL_TO_FIRE_RAW_DATA_EXP"

# Replace cron vars
sed "s#{{URL_TO_FIRE_RAW_DATA_AGGR}}#$URL_TO_FIRE_RAW_DATA_AGGR#g;s#{{URL_TO_FIRE_RAW_DATA_EXP}}#$URL_TO_FIRE_RAW_DATA_EXP#g;" cron.yaml.base > cron.yaml

# Replace app vars
sed "s#{{SHARED_INTERNAL_SECRET}}#$SHARED_INTERNAL_SECRET#g;" app.yaml.base > app.yaml

# Create the app
gcloud app create --region=$GCP_APP_LOCATION

gcloud app deploy --quiet

gcloud app deploy cron.yaml --quiet