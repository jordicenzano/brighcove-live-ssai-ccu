/*
 (c) Jordi Cenzano 2018
 *
 * GCP Cloud function
 *
 * @param {!Object} req HTTP request context.
 * @param {!Object} res HTTP response context.
 */
const BigQuery = require('@google-cloud/bigquery');

exports.main = (req, res) => {

    // Load env vars
    const GCP_PROJECT_ID = process.env.GCP_PROJECT; // From GCP
    const GCP_DATASET = process.env.GCP_DATASET;
    const GCP_TABLE = process.env.GCP_TABLE;
    const SHARED_API_SECRET = process.env.SHARED_API_SECRET;

    // Check if the request is legit
    if (SHARED_API_SECRET !== req.get('x-api-key'))
        return res.status(401).send(new Error ('Request NOT authorized'));

    // Check job id format
    if (checkSimpleGUIDString (req.query.jobid || "") === false)
        return res.status(400).send(new Error ('Wrong jobid format'));

    const jobid = req.query.jobid;

    // Check time range
    let time_in_ms = -1;
    let time_out_ms = -1;

    if (checkSimpleNumber (req.query.in || "NO", 64) === true)
        time_in_ms = req.query.in * 1000;

    if (checkSimpleNumber (req.query.out || "NO", 64) === true)
        time_out_ms = req.query.out * 1000;

    if (((time_in_ms > 0) && (time_out_ms < 0)) || ((time_in_ms < 0) && (time_out_ms > 0)) || (time_out_ms < time_in_ms))
        return res.status(400).send(new Error ('Invalid time rage (in - out)'));

    // Ini big query
    const bigquery = new BigQuery({projectId: GCP_PROJECT_ID});

    //TODO: Query Datastore NOT BQ!!!

    // The SQL query to run
    let sqlQuery = '';
    if ((time_in_ms > 0) && (time_out_ms > 0)) {
        // Range query
        console.log("Running a range query for jobid: " + jobid + ". In(ms): " + time_in_ms + ". Out(ms): " + time_out_ms);
        sqlQuery = 'SELECT TIMESTAMP_MILLIS(CAST(FLOOR(ts/60000) * 60000 AS INT64)) AS time, COUNT(distinct sessionid) as ccu FROM ' + GCP_DATASET + '.' + GCP_TABLE + ' WHERE jobid = "' + jobid + '" AND ts >= ' + time_in_ms + ' AND ts < ' + time_out_ms + ' group by time order by time asc';
    }
    else {
        // Last min query
        console.log("Running last min query for jobid: " + jobid);
        sqlQuery = 'SELECT count(DISTINCT sessionid ) AS CCU FROM ' + GCP_DATASET + '.' + GCP_TABLE +' WHERE jobid = "' +  jobid + '" AND TIMESTAMP_MILLIS(ts) > TIMESTAMP_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE)';
    }

    // Query options list: https://cloud.google.com/bigquery/docs/reference/v2/jobs/query
    const options = {
        query: sqlQuery,
        useLegacySql: false, // Use standard SQL syntax for queries.
    };

    // Runs the query
    bigquery
        .query(options)
        .then(results => {
            res.status(200).send(JSON.stringify(results));
        })
        .catch(err => {
            console.error('ERROR:', err);
            res.status(500).send(err);
        });
};

function checkSimpleGUIDString (guid_str, max_length = 32, min_length = 32) {
    if ( (typeof(guid_str) !== 'string') || (guid_str.length > max_length) || (guid_str.length < min_length))
        return false;

    return guid_str.match(new RegExp(/^[a-fA-F0-9]*$/)) !== null;
}

function checkSimpleNumber (num, max_length, min_length = 0) {
    let str = num;
    if (typeof(str) !== 'string')
        str = str.toString();

    if ( (str.length > max_length) || (str.length < min_length))
        return false;

    return str.match(new RegExp(/^[0-9]+[\.]*[0-9]+]*$/)) != null;
}
