var Helper = require("../Helper.js");

exports.Decoder = function(id) {
    this.id = id;
    this.parse = function(tokens) {
        var gsv;
        var i;
        var sat;
        if(tokens.length < 13) {
            throw new Error('GSV : not enough tokens');
        }

        // trim whitespace
        // some parsers may not want the tokens trimmed so the individual parser has to do it if applicable
        for(i=0;i<tokens.length;++i) {
            tokens[i] = tokens[i].trim();
        }

        gsv = {
            id : tokens[0].substr(1),
            msgs: Helper.parseIntX(tokens[1],10),
            mnum: Helper.parseIntX(tokens[2],10),
            count: Helper.parseIntX(tokens[3],10),
            sat:[]
        };

        // extract up to 4 sets of sat data
        for(i=4;i<tokens.length;i+= 4) {
            sat = {
                prn: Helper.parseIntX(tokens[i+0],10),
                el:Helper.parseIntX(tokens[i+1],10),
                az:Helper.parseIntX(tokens[i+2],10),
                ss:Helper.parseIntX(tokens[i+3],10)
            };

            gsv.sat.push(sat);
        }
        return gsv;
    };
};