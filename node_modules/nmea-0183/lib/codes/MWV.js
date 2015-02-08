var Helper = require("../Helper.js");

/*
 ------------------------------------------------------------------------------
 *******1   2 3   4 5
 *******|   | |   | |
 $--MWV,x.x,a,x.x,a,a*hh<CR><LF>
 ------------------------------------------------------------------------------

 Field Number:

 1. Wind Angle, 0 to 360 degrees
 2. Reference, R = Relative, T = True
 3. Wind Speed
 4. Wind Speed Units, K/M/N
 5. Status, A = Data Valid
 6. Checksum
 */

exports.Decoder = function (id) {
    this.id = id;
    this.parse = function (tokens) {
        var mwv;
        var i;
        if (tokens.length < 5) {
            throw new Error('MWV : not enough tokens');
        }

        // trim whitespace
        // some parsers may not want the tokens trimmed so the individual parser has to do it if applicable
        for (i = 0; i < tokens.length; ++i) {
            tokens[i] = tokens[i].trim();
        }


        mwv = {
            id: tokens[0].substr(1),
            angle: Helper.parseFloatX(tokens[1]),
            reference: tokens[2],
            speed: Helper.parseFloatX(tokens[3]),
            units: tokens[4],
            status: tokens[5]
        }
        return mwv;
    };
};