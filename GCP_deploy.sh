#!/usr/bin/env bash

# Load config
source ./config/config.vars

# Load secrets
source ./secrets/secrets.vars

BASE_DIR=`pwd`

echo "You should use gcloud auth login to log into your GCP account"
# TODO: ask continue

# Login if you are not already logged
#gcloud auth login

# Create the project (it will fail if it is created)
#gcloud projects create $GCP_PROJECT_ID

# IMPORTANT!!! (I could not find a way to automate it)
# Depending on your billing config you will have to manually assign this project to your billing account
# Depending on your config it will require to manually enable cloud functions

echo "At this point you should enter into the GCP webconsole, select project $GCP_PROJECT_ID and:"
echo "- Activate billing"
echo "- Activate cloud functions"
# TODO: ask continue

# Set the current project ID
#gcloud config set project $GCP_PROJECT_ID

# Create BIGQUERY resources
#bq --location=$GCP_BIGQUERY_LOCATION mk --dataset --default_table_expiration $GCP_DATASET_EXPIRATION_S --description "Data for CCU calculation" $GCP_PROJECT_ID:$GCP_DATASET_NAME

# Create a BIGQUERY table for heartbeats and add schema
#bq mk --table --description "Table for the heartbeats beacons" $GCP_PROJECT_ID:$GCP_DATASET_NAME.$GCP_TABLE_NAME ./config/table-schema.json

# Deploy collector app
#cd $BASE_DIR/collector

# TODO: Use local script with params

# Set the env vars for the app engine
#rm -f app.yaml

#sed "s/{{GCP_DATASET_NAME}}/$GCP_DATASET_NAME/g;s/{{GCP_TABLE_NAME}}/$GCP_TABLE_NAME/g;" app.yaml.base > app.yaml

# Create the app
#gcloud app create --region=$GCP_APP_LOCATION

#gcloud app deploy --quiet

# Create cloud function for the API
cd $BASE_DIR/api

# TODO: Use local script with params
gcloud beta functions deploy brighcovelive-ccu-api --quiet --runtime nodejs8 --trigger-http --entry-point main --set-env-vars GCP_DATASET=$GCP_DATASET_NAME,GCP_TABLE=$GCP_TABLE_NAME,SHARED_API_SECRET=$SHARED_API_SECRET

# Back to the origin
cd $BASE_DIR