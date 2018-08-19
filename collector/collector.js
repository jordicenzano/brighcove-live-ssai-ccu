/*
(c) Jordi Cenzano 2018
 */

'use strict';

// For local testing remember to set the following env variable to your creds file allowing to send data to BigQuery
// GOOGLE_APPLICATION_CREDENTIALS="[PATH]"

const SERVER_SIDE_HEARTBEAT_NAME = 'heartbeat';
const CLIENT_SIDE_HEARTBEAT_NAME = 'csheartbeat';

// Beacon source ID in BiqQuery (should be the same used in aggregator)
const enBeaconOriginFlag = {
    CLIENT_SIDE: 'cs',
    SERVER_SIDE: 'ss'
};

// Imports common functions
const utils = require('./utils');

// Imports the Google Cloud client library
const BigQuery = require('@google-cloud/bigquery');

// Creating webserver
const express = require('express');
const app = express();

// LOAD CONFIG

// GCP BigQuery config data
const GCP_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT; // From GCP
const GCP_DATASET = process.env.GCP_DATASET;
const GCP_TABLE = process.env.GCP_TABLE;
const SHARED_BEACON_SERVER_SIDE_SECRET = process.env.SHARED_BEACON_SERVER_SIDE_SECRET || "";

console.log(logToString('CONFIGGCP','', `GCPProjectID:${GCP_PROJECT_ID},GCP_DATASET:${GCP_DATASET},GCP_TABLE:${GCP_TABLE}`));

// Constants
const APP_LISTEN_PORT = process.env.PORT || 8080; //Comes from GCP

console.log(logToString('CONFIGAPP', '', `APPPort:${APP_LISTEN_PORT}`));

// Creates a BQ client
const bigquery = new BigQuery({
    projectId: GCP_PROJECT_ID,
});

// Receive beacon
app.get('/:guid/:jobid/:sessionid/:account_billing_id/:tsepoch/:heartbeat', function (req, res, next) {
    const start_exec = new Date();

    // Check if the server side request is legit (If secret validation is enabled)
    if ((SHARED_BEACON_SERVER_SIDE_SECRET !== "")&&(SHARED_BEACON_SERVER_SIDE_SECRET !== "none")) {
        if (SHARED_BEACON_SERVER_SIDE_SECRET !== req.get('x-api-key'))
            return next(createError(401, 'Request NOT authorized'));
    }

    //Load data
    if (utils.checkSimpleGUIDString(req.params.guid) === false)
        return next(createError(400, 'GUID wrong format'));

    console.log(logToString('APP', req.params.guid, 'Received heartbeat'));

    const err = checkInputParams(req.params);
    if (err !== null)
        return next(err);

    if (utils.checkSimpleGUIDString(req.params.jobid) === false)
        return next(new Error("Job id wrong format"));

    // Create datapoint
    const dp = createDatapointFromReqParams(req.params);

    // Fire datapoint
    fireDatapoint(dp, function (err, data) {
        const dur_exec = new Date() - start_exec;

        if (err) {
            return next(createError(500, "Error inserting data to BQ"));
        }
        else {
            console.log(logToString('APP', '', `Heartbeat processed & inserted in ${dur_exec} ms`, data));

            return res.send("");
        }
    });
});

//Handle Errors
app.use(function (error, req, res, next) {
    error.status = error.status || 500;
    error.message = error.message || '500: Internal Server Error. ' + JSON.stringify(error);

    console.error(JSON.stringify(error));

    return res.status(error.status).send(error.message);
});

// Start webserver
app.listen(APP_LISTEN_PORT, () => console.log(logToString('HTTP', '', `App listening on port ${APP_LISTEN_PORT}!`)));

// Error helper
function createError(status, message) {
    const err = new Error(message);

    err.status = status;

    return err;
}

// Verify input params
function checkInputParams (params) {
    let err = null;

    if (utils.checkSimpleGUIDString(params.jobid) === false)
        err = createError(400, 'Job id wrong format');

    if (utils.checkSimpleGUIDString(params.sessionid) === false)
        err = createError(400, 'Session id wrong format');

    if (utils.checkSimpleString(params.account_billing_id, 64) === false)
        err = createError(400, 'VC id wrong format');

    if (utils.checkSimpleNumber(params.tsepoch, 64) === false)
        err = createError(400, 'tsepoch wrong format');

    if ((params.heartbeat !== SERVER_SIDE_HEARTBEAT_NAME) && (params.heartbeat !== CLIENT_SIDE_HEARTBEAT_NAME))
        err = createError(400, 'heartbeat wrong name');

    return err;
}

// Fire all datapoints
function fireDatapoint(dp, callback) {
    // Inserts data into a table

    bigquery
        .dataset(GCP_DATASET)
        .table(GCP_TABLE)
        .insert(dp)
        .then(() => {
            console.log(logToString('BQ', '', `Inserted 1 row`));

            return callback(null, dp);
        })
        .catch(err => {

            //TODO: retries?
            // Or save into gs files and have a cron task that reingest those later
            // resilient to a BQ outage

            if (err && err.name === 'PartialFailureError') {
                if (err.errors && err.errors.length > 0) {
                    console.log('BIGQUERY: Insert errors:');
                    err.errors.forEach(err => console.error(err));
                }
            }
            else {
                console.error(logToString('BQ', '', 'Error: ' + err));
            }

            return callback(err, dp);
        });
}

// Utils
function createDatapointFromReqParams(params) {
    const ret = {
        ts: parseInt(params.tsepoch * 1000),
        rx_at: Date.now(),
        guid: params.guid,
        jobid: params.jobid,
        sessionid: params.sessionid,
        vc_id: params.account_billing_id,
        source: enBeaconOriginFlag.SERVER_SIDE
    };

    if (params.heartbeat === CLIENT_SIDE_HEARTBEAT_NAME)
        ret.source = enBeaconOriginFlag.CLIENT_SIDE;

    return ret;
}

// Message to string
function logToString(prefix = "", guid = "", suffix = "", dp = null) {
    let str = prefix + ';' + guid + ';;;;;' + suffix;

    if (dp !== null) {
        str = prefix + `;${dp.guid};${dp.jobid};${dp.sessionid};${dp.vc_id};${dp.ts};` + suffix;
    }
    return str;
}
