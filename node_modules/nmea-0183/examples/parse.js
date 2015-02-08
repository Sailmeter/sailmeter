var util = require('util'),
    nmea = require('nmea');

console.log(util.inspect(nmea));

var sentence = '$GPGGA,123519,4807.038,N,01131.324,E,1,08,0.9,545.4,M,46.9,M, , *42';
var gga = nmea.parse(sentence);
console.log(util.inspect(gga));

