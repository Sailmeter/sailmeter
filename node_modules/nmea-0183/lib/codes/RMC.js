var Helper = require("../Helper.js");

/** RMC encoder object
 * $GPRMC,hhmmss.ss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,ddmmyy,x.x,a*hh

 RMC  = Recommended Minimum Specific GPS/TRANSIT Data

 1    = UTC of position fix
 2    = Data status (V=navigation receiver warning)
 3    = Latitude of fix
 4    = N or S
 5    = Longitude of fix
 6    = E or W
 7    = Speed over ground in knots
 8    = Track made good in degrees True
 9    = UT date
 10   = Magnetic variation degrees (Easterly var. subtracts from true course)
 11   = E or W
 12   = Checksum

 input: {
     date:Date UTC
     status:String (single character)
     latitude:decimal degrees (N is +)
     longitude:decimal degrees (E is +)
     speed:decimal knots
     course:decimal degrees
     variation:decimal magnetic variation (E is -)
     }
 */
exports.Encoder = function(id) {
    this.id = id;
    this.encode = function(id, data) {
        var a = [];
        var rmc;
        // $GPRMC,hhmmss.ss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,ddmmyy,x.x,a*hh

        a.push('$' + id);
        a.push(Helper.encodeTime(data.date));
        a.push(Helper.encodeValue(data.status));
        a.push(Helper.encodeLatitude(data.lat, 3));
        a.push(Helper.encodeLongitude(data.lon, 3));
        a.push(Helper.encodeKnots(data.speed));
        a.push(Helper.encodeDegrees(data.course));
        a.push(Helper.encodeDate(data.date));
        a.push(Helper.encodeMagVar(data.variation));

        rmc = a.join();

//        rmc += data.mode

        return rmc;
    };
};

/** GPRMC parser object */
exports.Decoder = function(id) {
    this.id = id;
    this.parse = function(tokens) {
        var rmc;
        if(tokens.length < 12) {
            throw new Error('RMC : not enough tokens');
        }

        rmc = {
            id : tokens[0].substr(1),
            time : tokens[1],
            valid : tokens[2],
            latitude : Helper.parseLatitude(tokens[3], tokens[4]),
            longitude : Helper.parseLongitude(tokens[5], tokens[6]),
            speed : Helper.parseFloatX(tokens[7]),
            course : Helper.parseFloatX(tokens[8]),
            date : tokens[9],
            mode: tokens[11].substr(0,1),
            variation : Helper.parseDegrees(tokens[10], tokens[11])
        };
        return rmc;
    };
};