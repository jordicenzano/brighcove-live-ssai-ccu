/*
(c) Jordi Cenzano 2018
 */

'use strict';

// For local testing remember to set the following env variable to your creds file allowing to send data to BigQuery
// GOOGLE_APPLICATION_CREDENTIALS="[PATH]"

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
const SHARED_BEACON_SECRET = process.env.SHARED_BEACON_SECRET || "";

console.log(logToString('CONFIGGCP','', `GCPProjectID:${GCP_PROJECT_ID},GCP_DATASET:${GCP_DATASET},GCP_TABLE:${GCP_TABLE}`));

// Constants
const APP_LISTEN_PORT = process.env.PORT || 8080; //Comes from GCP
const APP_FIRE_PERIOD_MS = process.env.APP_FIRE_PERIOD_MS;
const APP_MAX_QUEUE_BEFORE_FIRE = process.env.APP_MAX_QUEUE_BEFORE_FIRE;

console.log(logToString('CONFIGAPP', '', `APPPort:${APP_LISTEN_PORT},APPFirePeriodMs:${APP_FIRE_PERIOD_MS},MaxQueueBeforeFire:${APP_MAX_QUEUE_BEFORE_FIRE}`));

// Global vars
const datapoints = [];
let htimeout = null;

// Creates a BQ client
const bigquery = new BigQuery({
    projectId: GCP_PROJECT_ID,
});

// Receive beacon
app.get('/:guid/:jobid/:sessionid/:account_billing_id/:tsepoch/heartbeat', function (req, res, next) {
    const start_exec = new Date();

    // Check if the request is legit if we enable api validation
    if ((SHARED_BEACON_SECRET !== "")&&(SHARED_BEACON_SECRET !== "none")) {
        if (SHARED_BEACON_SECRET !== req.get('x-api-key'))
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

    datapoints.push(dp);

    if (datapoints.length >= APP_MAX_QUEUE_BEFORE_FIRE) {
        //setImmediate(fireDatapoints);
        fireDatapoints();
    }
    else {
        if ((htimeout === null) && (APP_FIRE_PERIOD_MS > 0))
            htimeout = setTimeout(fireDatapoints, APP_FIRE_PERIOD_MS);
    }

    const dur_exec = new Date() - start_exec;

    console.log(logToString('APP', '', `Heartbeat processed & inserted in ${dur_exec} ms`,dp));

    return res.send("");
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

    return err;
}

// Fire all datapoints
function fireDatapoints() {
    // Inserts data into a table

    if (datapoints.length <= 0)
        return;

    bigquery
        .dataset(GCP_DATASET)
        .table(GCP_TABLE)
        .insert(datapoints)
        .then(() => {
            console.log(logToString('BQ', '', `Inserted ${datapoints.length} rows`));
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
            } else {
                console.error(logToString('BQ', '', 'Error: ' + err));
            }
        })
        .then(() => {
            // Remove datapoints & timeout
            datapoints.length = 0;
            htimeout = null;
        });
}

// Utils
function createDatapointFromReqParams(params) {
    return {
        ts: parseInt(params.tsepoch * 1000),
        rx_at: Date.now(),
        guid: params.guid,
        jobid: params.jobid,
        sessionid: params.sessionid,
        vc_id: params.account_billing_id
    };
}

// Message to string
function logToString(prefix = "", guid = "", suffix = "", dp = null) {
    let str = prefix + ';' + guid + ';;;;;' + suffix;

    if (dp !== null) {
        str = prefix + `;${dp.guid};${dp.jobid};${dp.sessionid};${dp.vc_id};${dp.ts};` + suffix;
    }
    return str;
}

