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

//TODO: Add readme and some kind of disclaimer saying that this is a simple POC
// POC NOT designed to work for large audiences.
// To use it in large audiences we need to do some cost optimization / data partitioning / add cache at API, if NOT it could create high GCP costs

// Creating webserver
const express = require('express');
const app = express();

// LOAD CONFIG

// GCP BigQuery config data
const GCP_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT; // From GCP
const GCP_DATASET = process.env.GCP_DATASET;
const GCP_TABLE = process.env.GCP_TABLE;
const SHARED_HEARTBEAT_SECRET = process.env.SHARED_HEARTBEAT_SECRET || "";


console.log(`CONFIGGCP;;;;GCPProjectID:${GCP_PROJECT_ID},GCPProjectID:${GCP_DATASET},GCPProjectID:${GCP_TABLE}`);

// Constants
const APP_LISTEN_PORT = process.env.PORT || 8080; //Comes from GCP
const APP_FIRE_PERIOD_MS = process.env.APP_FIRE_PERIOD_MS;
const APP_MAX_QUEUE_BEFORE_FIRE = process.env.APP_MAX_QUEUE_BEFORE_FIRE;

console.log(`CONFIGAPP;;;;APPPort:${APP_LISTEN_PORT},APPFirePeriodMs:${APP_FIRE_PERIOD_MS},MaxQueueBeforeFire:${APP_MAX_QUEUE_BEFORE_FIRE}`);

// Global vars
const datapoints = [];
let htimeout = null;

// Receive beacon
app.get('/:guid/:jobid/:sessionid/:account_billing_id/:tsepoch/heartbeat', function (req, res, next) {
    const start_exec = new Date();

    // Check if the request is legit if we enable api validation
    if (SHARED_HEARTBEAT_SECRET !== "") {
        if (SHARED_HEARTBEAT_SECRET !== req.get('x-api-key'))
            return next(createError(401, 'Request NOT authorized'));
    }

    //Load data
    if (utils.checkSimpleGUIDString(req.params.guid) === false)
        return next(createError(400, 'GUID wrong format'));

    const guid = req.params.guid;

    console.log(req.params.guid + ";;;;Received heartbeat");

    const err = checkInputParams(req.params);
    if (err !== null)
        return next(err);

    if (utils.checkSimpleGUIDString(req.params.jobid) === false)
        return next(new Error("Job id wrong format"));

    const jobid = req.params.jobid;
    const sessionid = req.params.sessionid;
    const account_billing_id = req.params.account_billing_id;
    const tsepoch_ms = parseInt(req.params.tsepoch) * 1000;

    const log_prefix = `${guid};${jobid};${sessionid};${account_billing_id};`;

    const dur_exec = new Date() - start_exec;

    datapoints.push(createDatapoint(tsepoch_ms, guid, jobid, sessionid, account_billing_id));

    console.log(log_prefix + "Heartbeat processed in " + dur_exec);

    if (datapoints.length >= APP_MAX_QUEUE_BEFORE_FIRE) {
        setImmediate(fireDatapoints);
    }
    else {
        if (htimeout === null)
            htimeout = setTimeout(fireDatapoints, APP_FIRE_PERIOD_MS);
    }

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
app.listen(APP_LISTEN_PORT, () => console.log(`HTTP;;;;App listening on port ${APP_LISTEN_PORT}!`));


// Error helper
function createError(status, message) {
    const err = new Error(message);

    err.status = status;

    return err;
}

// Verify input params
function checkInputParams (params) {
    let err = null;

    if (utils.checkSimpleGUIDString(params.sessionid) === false)
        err = createError(400, 'Session id wrong format');

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
    const log_prefix = "BIGQUERY;;;;";

    // Creates a client
    const bigquery = new BigQuery({
        projectId: GCP_PROJECT_ID,
    });

    // Inserts data into a table
    bigquery
        .dataset(GCP_DATASET)
        .table(GCP_TABLE)
        .insert(datapoints)
        .then(() => {
            console.log(`${log_prefix}Inserted ${datapoints.length} rows`);
        })
        .catch(err => {

            //TODO: retries?

            if (err && err.name === 'PartialFailureError') {
                if (err.errors && err.errors.length > 0) {
                    console.log('BIGQUERY: Insert errors:');
                    err.errors.forEach(err => console.error(err));
                }
            } else {
                console.error(`${log_prefix}ERROR:`, err);
            }
        })
        .then(() => {
            // Remove datapoints & timeout
            datapoints.length = 0;
            htimeout = null;
        });
}

// Utils
function createDatapoint(tsepoch_ms, guid, jobid, sessionid, account_billing_id) {
    return {
        ts: tsepoch_ms,
        guid: guid,
        jobid: jobid,
        sessionid: sessionid,
        vc_id: account_billing_id
    };
}
