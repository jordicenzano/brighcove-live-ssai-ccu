
exports.checkSimpleGUIDString = function checkSimpleGUIDString (guid_str, max_length = 32, min_length = 32) {
    if ( (typeof(guid_str) !== 'string') || (guid_str.length > max_length) || (guid_str.length < min_length))
        return false;

    return guid_str.match(new RegExp(/^[a-fA-F0-9]*$/)) !== null;
};

exports.checkSimpleString = function (str, max_length, min_length = 0) {
    if ( (typeof(str) !== 'string') || (str.length > max_length) || (str.length < min_length))
        return false;

    return str.match(new RegExp(/^[a-zA-Z0-9\-_\.]*$/)) != null;
};

exports.checkSimpleNumber = function (str, max_length, min_length = 0) {
    if ( (typeof(str) !== 'string') || (str.length > max_length) || (str.length < min_length))
        return false;

    return str.match(new RegExp(/^[0-9]*$/)) != null;
};
