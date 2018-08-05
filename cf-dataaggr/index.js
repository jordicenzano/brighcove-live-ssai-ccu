/*
 (c) Jordi Cenzano 2018
 *
 * GCP Cloud function
 *
 * @param {!Object} req HTTP request context.
 * @param {!Object} res HTTP response context.
 */
const BigQuery = require('@google-cloud/bigquery');

// Imports the Google Cloud client library
const Datastore = require('@google-cloud/datastore');

exports.main = (req, res) => {

    // Load env vars
    const GCP_PROJECT_ID = process.env.GCP_PROJECT; // From GCP
    const GCP_DATASET = process.env.GCP_DATASET;
    const GCP_TABLE = process.env.GCP_TABLE;
    const SHARED_INTERNAL_SECRET = process.env.SHARED_INTERNAL_SECRET;
    const GCP_DS_KIND = process.env.GCP_DS_KIND;
    const MAX_BEACON_DELAY_S = parseInt(process.env.MAX_BEACON_DELAY_S);
    const CCU_AGGREGATION_PERIOD_MS = parseInt(process.env.CCU_AGGREGATION_PERIOD_MS);

    console.log(`CONFIG, GCP_PROJECT_ID: ${GCP_PROJECT_ID}, GCP_DATASET:${GCP_DATASET}, GCP_TABLE:${GCP_TABLE}; SHARED_INTERNAL_SECRET: ${SHARED_INTERNAL_SECRET}; GCP_DS_KIND: ${GCP_DS_KIND}; MAX_BEACON_DELAY_S: ${MAX_BEACON_DELAY_S}; AGGREGATION_PERIOD_MS`);

    // Check if the request is legit
    if (SHARED_INTERNAL_SECRET !== req.get('x-api-key'))
        return res.status(401).send(new Error ('Request NOT authorized'));

    // Check time range
    let time_in_ms = Date.now();
    let time_out_ms = time_in_ms - (MAX_BEACON_DELAY_S * 1000);

    // Ini big query
    const bigquery = new BigQuery({projectId: GCP_PROJECT_ID});

    // The SQL query to run
    let sqlQuery = `SELECT TIMESTAMP_MILLIS(CAST(FLOOR(ts/${CCU_AGGREGATION_PERIOD_MS}) * ${CCU_AGGREGATION_PERIOD_MS} AS INT64)) AS time, COUNT(distinct sessionid) AS ccu, jobid AS jobid, TIMESTAMP_MILLIS(MAX(rx_at)) AS last_rx_at FROM ${GCP_DATASET}.${GCP_TABLE} WHERE ts > ${time_out_ms}  AND ts <= ${time_in_ms} GROUP BY time, jobid ORDER BY time ASC`;

    // Query options list: https://cloud.google.com/bigquery/docs/reference/v2/jobs/query
    const options = {
        query: sqlQuery,
        useLegacySql: false, // Use standard SQL syntax for queries.
    };

    // Runs the query
    bigquery
        .query(options)
        .then(results => {
            try {
                insertDataDataStore(GCP_PROJECT_ID, GCP_DS_KIND, results, function (err, num_inserted_records) {
                    if (err) {
                        res.status(500).send('ERROR DS: inserting entities in Datastore: ' + err.toString());
                        return;
                    }
                    res.status(200).send('DS Processed / inserted entities: ' + num_inserted_records);
                    return;
                });
            }
            catch (err) {
                res.status(500).send('ERROR DS: in Datastore: ' + err.toString());
                return;
            }
        })
        .catch(err => {
            console.error('ERROR:', err);
            res.status(500).send('ERROR BQ: ' + err);
            return;
        });
};

function calculateMinFromIni(date_str) {
    // Return the epoch in minutes
    return Math.floor(new Date(date_str).getTime() / (1000 * 60));
}

function createEntityFromBQObj(datastore, kind, data) {
    const min_from_ini = calculateMinFromIni(data.time.value);
    const keyName = data.jobid + '-' + min_from_ini;

    const key =  datastore.key([kind, keyName]);

    const entity = {
        key: key,
        data: [
            { name: 'jobid', value: data.jobid },
            { name: 'time', value: new Date(data.time.value) },
            { name: 'ccu', value: data.ccu, excludeFromIndexes: true },
            { name: 'last_rx_at', value: new Date(), excludeFromIndexes: true }
        ]
    };

    return entity;
}

function insertDataDataStore(projectId, ds_kind, results, callback) {

    // Creates a client
    const datastore = new Datastore({ projectId: projectId });

    const entities_to_insert = [];

    // Just in case iterate over the results
    results.forEach(function(element) {
        element.forEach(function(row) {
            entities_to_insert.push(createEntityFromBQObj(datastore, ds_kind, row));
        });
    });

    if (entities_to_insert.length <= 0) {
        console.log('No entities to be inserted/updated');
        return callback(null, 0);
    }

    //Insert the final data to the min agg table
    datastore
        .upsert(entities_to_insert)
        .then(() => {
            return callback(null, entities_to_insert.length);
        })
        .catch(err => {
            return callback(err, 0);
        });
}