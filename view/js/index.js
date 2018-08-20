// To keep the code secure we will some parameters form URL querystring
// Example:
// https://www.myserver.com/ssai-demo.html?apiep=AAAA&secret=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234&in=AAA&out=BBB

// Just local for testing
const api_test_data = [{"time":"2018-08-18T19:01:00.000Z","ccu":2000,"csccu":1998,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:31:04.459Z"},
    {"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:30:03.293Z","time":"2018-08-18T19:00:00.000Z","ccu":2000, "csccu":1998},
    {"last_rx_at":"2018-08-18T19:29:09.227Z","csccu":1998,"time":"2018-08-18T18:59:00.000Z","ccu":1998,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b"},
    {"time":"2018-08-18T18:58:00.000Z","ccu":1998,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","csccu":2000,"last_rx_at":"2018-08-18T19:28:06.536Z"},
    {"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:27:02.667Z","csccu":1998,"time":"2018-08-18T18:57:00.000Z","ccu":2000},
    {"time":"2018-08-18T18:56:00.000Z","ccu":2000,"csccu":1998,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:26:04.480Z"},
    {"time":"2018-08-18T18:55:00.000Z","csccu":2000,"ccu":1998,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:25:02.922Z"},
    {"time":"2018-08-18T18:54:00.000Z","csccu":2000,"ccu":1998,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:24:03.357Z"},
    {"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:23:03.625Z","time":"2018-08-18T18:53:00.000Z","ccu":1789,"csccu":1784},
    {"time":"2018-08-18T18:52:00.000Z","ccu":1123,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","csccu":1120,"last_rx_at":"2018-08-18T19:22:03.351Z"},
    {"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b","last_rx_at":"2018-08-18T19:21:03.510Z","time":"2018-08-18T18:51:00.000Z","ccu":456,"csccu":450},
    {"last_rx_at":"2018-08-18T19:19:03.117Z","time":"2018-08-18T18:49:00.000Z","csccu":1,"ccu":1,"jobid":"5a50934b9c2c4c21b6d59e74618d4f7b"}];

// Load params, process and paint the graph
function onLoadPage() {
    let apiep = "";
    let secret = "";
    let jobid = "";
    let timeout_s = Math.ceil(new Date().getTime() / 1000);
    let timein_s = timeout_s - (30 * 60  * 1000);

    const url_vars = getUrlVars();

    console.log("URL detected vars = " + JSON.stringify(url_vars));

    if ( (!("apiep" in url_vars)) || (!("jobid" in url_vars)) || (!("secret" in url_vars)) ) {
        console.error("Use the following syntax in the URL QS: https://www.myserver.com/ssai-demo.html?apiep=AAAA&secret=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234&in=AAA&out=BBB");

        // Warning
        document.getElementById('columnchart_material').innerHTML = "This webpage is based on querystring parameters, please use the following syntax in the URL<br>https://www.myserver.com/ssai-demo.html?apiep=AAAA&secret=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234&in=AAA&out=BBB<br>Example: https://www.myserver.com/ssai-demo.html?&apiep=https://MY_PROJECT_ID.cloudfunctions.net/ccudata&secret=MYSECRET&jobid=5a50934b9c2c4c21b6d59e74618d4f7b&in=1534618140&out=1534619940";
    }
    else {
        apiep = url_vars.apiep;
        jobid = url_vars.jobid;
        secret = url_vars.secret;

        console.log("Detected params ApiUrl: " + apiep + ", secret: " + secret + ", jobid: " + jobid);

        if ("in" in url_vars)
            timein_s = url_vars.in;

        if ("out" in url_vars)
            timeout_s = url_vars.out;

        console.log("Times used for the query, in:  " + new Date(timein_s * 1000) + ", out:  " + new Date(timeout_s * 1000));

        // Create URL with QS
        const url = apiep + "?jobid=" + jobid + "&in=" + timein_s + "&out=" + timeout_s;

        // Process
        fetchData(url, secret)
            .then(api_data => processData(api_data))
            .then(graph_data => drawChart(graph_data,'CCU (concurrent viewers server side & client side)', 'JobId: ' + jobid))
            .catch(error => console.error(error));
    }
}

// Read vars from QS
function getUrlVars() {
    var vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });

    return vars;
}

// Fetch the data from the DB (via API)
function fetchData(ep_url, secret) {
    return fetch(ep_url, {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, cors, *same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "x-api-key": secret
        }
    }).then(function(response) {
        return response.json();
    })
}

// Process the data and transform it
function processData (raw_api_response) {
    const data = [['Date', 'Server Side', 'Player side']];

    for (let n = (raw_api_response.length - 1); n >= 0 ; n--) {
        const elem_api = raw_api_response[n];

        const ssccu = elem_api.ssccu || elem_api.ccu;
        let csccu = 0;
        if ('csccu' in elem_api)
            csccu = elem_api.csccu;

        const elem_data = [
            elem_api.time, ssccu, csccu
        ];

        data.push(elem_data);
    }

    return Promise.resolve(google.visualization.arrayToDataTable(data));
}

// Draw the chart
function drawChart(graph_data, title, desc) {

    const options = {
        chart: {
            title: title,
            subtitle: desc
        }
    };

    const chart = new google.charts.Bar(document.getElementById('columnchart_material'));

    chart.draw(graph_data, google.charts.Bar.convertOptions(options));
}
