var Helper = require("../Helper.js");

/*
 === DBT - Depth below transducer ===

 ------------------------------------------------------------------------------
 *******1   2 3   4 5   6 7
 *******|   | |   | |   | |
 $--DBT,x.x,f,x.x,M,x.x,F*hh<CR><LF>
 ------------------------------------------------------------------------------

 Field Number:

 1. Depth, feet
 2. f = feet
 3. Depth, meters
 4. M = meters
 5. Depth, Fathoms
 6. F = Fathoms
 7. Checksum
 */

exports.Decoder = function (id) {
    this.id = id;
    this.parse = function (tokens) {
        if (tokens.length < 6) {
            throw new Error('DBT : not enough tokens');
        }

        return {
            id: tokens[0].substr(1),
            depthMeters: Helper.parseFloatX(tokens[3]),
            depthFeet: Helper.parseFloatX(tokens[1])
            //ignore depth in fathoms, my guess is that nobody would need that
        }
    };
};