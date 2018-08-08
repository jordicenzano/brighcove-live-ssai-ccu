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
    const SHARED_INTERNAL_SECRET = process.env.SHARED_INTERNAL_SECRET;
    const BEACON_EXPIRATION_S = parseInt(process.env.BEACON_EXPIRATION_S);

    console.log(`CONFIG, GCP_PROJECT_ID: ${GCP_PROJECT_ID}, GCP_DATASET:${GCP_DATASET}, GCP_TABLE:${GCP_TABLE}; SHARED_INTERNAL_SECRET: ${SHARED_INTERNAL_SECRET}; BEACON_EXPIRATION_S: ${BEACON_EXPIRATION_S}`);

    // Check if the request is legit
    if (SHARED_INTERNAL_SECRET !== req.get('x-api-key'))
        return res.status(401).send(new Error ('Request NOT authorized'));

    // Calculate deletion threshold
    let time_delete_older_than_ms = Date.now() - (BEACON_EXPIRATION_S * 1000);

    // Ini big query
    const bigquery = new BigQuery({projectId: GCP_PROJECT_ID});

    // The SQL query to run
    let sqlQuery = `DELETE FROM ${GCP_DATASET}.${GCP_TABLE} WHERE ts < ${time_delete_older_than_ms}`;

    // Query options list: https://cloud.google.com/bigquery/docs/reference/v2/jobs/query
    const options = {
        query: sqlQuery,
        useLegacySql: false, // Use standard SQL syntax for queries.
    };

    // Runs the query
    bigquery
        .query(options)
        .then(results => {
            res.status(200).send('BQ deleted rows: ' + JSON.stringify(results));
            return;

        })
        .catch(err => {
            console.error('ERROR:', err);
            res.status(500).send('ERROR BQ: ' + err);
            return;
        });
};
