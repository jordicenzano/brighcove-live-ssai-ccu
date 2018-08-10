/*
 (c) Jordi Cenzano 2018
 *
 * GCP Cloud function
 *
 * @param {!Object} req HTTP request context.
 * @param {!Object} res HTTP response context.
 */

// Imports the Google Cloud DS
const Datastore = require('@google-cloud/datastore');

exports.main = (req, res) => {

    // Load env vars
    const GCP_PROJECT_ID = process.env.GCP_PROJECT; // From GCP
    const GCP_DS_KIND = process.env.GCP_DS_KIND;
    const SHARED_API_SECRET = process.env.SHARED_API_SECRET;

    // Check if the request is legit
    if (SHARED_API_SECRET !== req.get('x-api-key'))
        return res.status(401).send(new Error ('Request NOT authorized'));

    // Check job id format
    if (checkSimpleGUIDString (req.query.jobid || "") === false)
        return res.status(400).send(new Error ('Wrong jobid format'));

    const jobid = req.query.jobid;

    // Check time range
    let time_out_ms = Date.now();
    let time_in_ms = time_out_ms - (60 * 60 * 1000); // Default to 1h

    if (checkSimpleNumber (req.query.in || "NO", 64) === true)
        time_in_ms = req.query.in * 1000;

    if (checkSimpleNumber (req.query.out || "NO", 64) === true)
        time_out_ms = req.query.out * 1000;

    if (((time_in_ms > 0) && (time_out_ms < 0)) || ((time_in_ms < 0) && (time_out_ms > 0)) || (time_out_ms < time_in_ms))
        return res.status(400).send(new Error ('Invalid time rage (in - out)'));

    // Creates a client
    const datastore = new Datastore({ projectId: GCP_PROJECT_ID });

    // Create the date
    const date_in = new Date(time_in_ms);
    const date_out = new Date(time_out_ms);

    // Query Datastore index
    const query = datastore.createQuery(GCP_DS_KIND)
        .filter('jobid', '=', jobid)
        .filter('time', '<', date_out)
        .filter('time', '>=', date_in)
         .order('time', {
            descending: true,
        });

    datastore
        .runQuery(query)
        .then(results => {
            // Task entities found.

            const results_pointer = results[0];
            const results_array = [];

            results_pointer.forEach(elem => results_array.push(elem));

            res.status(200).send(JSON.stringify(results_array));
            return;
        })
        .catch(err => {
            console.error('ERROR:', err);
            res.status(500).send(err);
            return;
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
