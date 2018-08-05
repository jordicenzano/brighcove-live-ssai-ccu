#!/usr/bin/env bash

# Load config
source ./config/config.vars

# Load secrets
source ./secrets/secrets.vars

BASE_DIR=`pwd`

echo "Now we are goint to execute gcloud auth login. You will need to manually log in into your GCP account"
read -p "Press ENTER to continue ************************"

# Login if you are not already logged
gcloud auth login

# Create the project (it will fail if it is created)
gcloud projects create $GCP_PROJECT_ID

echo "At this point you should enter into the GCP webconsole, select project $GCP_PROJECT_ID and:"
echo "- Activate billing"
echo "- Activate cloud functions"
read -p "Press ENTER to continue ************************"

# Set the current project ID
gcloud config set project $GCP_PROJECT_ID

# Create BIGQUERY dataset
# TODO: It promts to select the default project, but tre project is alredy specified in the command (GCP bug?)
bq --location=$GCP_BIGQUERY_LOCATION mk --dataset --default_table_expiration $GCP_DATASET_EXPIRATION_S --description "Data for CCU calculation" $GCP_PROJECT_ID:$GCP_DATASET

# Create a BIGQUERY table for heartbeats and add schema
bq mk --table --description "Table for the heartbeats beacons" $GCP_PROJECT_ID:$GCP_DATASET.$GCP_TABLE ./config/table-schema.json

# Deploy collector app
cd $BASE_DIR/collector
./GCP_deploy_collector.sh

# Create cloud function for the API
cd $BASE_DIR/cf-api
./GCP_deploy_api.sh

# Create cloud function for BQ Dagit dfota aggregation
cd $BASE_DIR/cf-dataaggr
./GCP_deploy_dataaggr.sh

# Back to the origin
cd $BASE_DIR