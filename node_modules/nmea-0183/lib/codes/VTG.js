var Helper = require("../Helper.js");

exports.Decoder = function(id) {
    this.id = id;
    this.parse = function(tokens) {
        var vtg;
        var i;
        if(tokens.length < 9) {
            throw new Error('GSA : not enough tokens');
        }

        // trim whitespace
        // some parsers may not want the tokens trimmed so the individual parser has to do it if applicable
        for(i=0;i<tokens.length;++i) {
            tokens[i] = tokens[i].trim();
        }

//        console.log(JSON.stringify(tokens))
        vtg = {
            id : tokens[0].substr(1),
            course: Helper.parseFloatX(tokens[1]),
            knots: Helper.parseFloatX(tokens[5]),
            kph: Helper.parseFloatX(tokens[7]),
            mode: tokens[9]
        };

        return vtg;
    };
};