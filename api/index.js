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
        return res.status(400).send(new Error ('Request NOT authorized'));

    const jobid = req.query.jobid;

    // Ini big query
    const bigquery = new BigQuery({projectId: GCP_PROJECT_ID});

    // The SQL query to run
    const sqlQuery = 'SELECT count(DISTINCT sessionid ) AS CCU FROM ' + GCP_DATASET + '.' + GCP_TABLE +' WHERE jobid = "' +  jobid + '" AND TIMESTAMP_MILLIS(ts) > TIMESTAMP_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE)';

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
