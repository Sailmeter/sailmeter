/** NMEA-0183 Parser-Encoder 
* from git://github.com/nherment/node-nmea.git
* version 0.0.7
*/

var utils = require("./utils.js");
var fs = require('fs');

/** NMEA module */
var NMEA = ( function() {

    "use strict";

    /** NMEA public API */
    var nmea = {
    };

    /** private module variables */
    var m_parserList = [];
    var m_errorHandler = null;
    var parsers = {};


    // =============================================
    // public API functions
    // =============================================

    nmea.loadParsers = function() {
      // Load parser defn file
      parsers = JSON.parse(fs.readFileSync(__dirname + '/parsers.json', 'utf8'));
    };

    // function to add parsers
    nmea.addParser = function(sentenceParser) {
        if(sentenceParser === null) {
            this.error('invalid sentence parser : null');
            return;
        }
        m_parserList.push(sentenceParser);
    };

    /** master parser function
     * handle string tokenizing, find the associated parser and call it if there is one
     */
    nmea.parse = function(sentence) {
        var i;
        var tokens;
        var id;
        var result;
        var checksum;
        var status;
        if(( typeof sentence) !== 'string') {
            this.error('sentence is not a string');
            return null;
        }

        // find the checksum and remove it prior to tokenizing
        checksum = sentence.split('*');
        if(checksum.length === 2) {
            // there is a checksum
            sentence = checksum[0];
            checksum = checksum[1];
        } else {
            checksum = null;
        }

        tokens = sentence.split(',');
        if(tokens.length < 1) {
            this.error('must at least have a header');
            return null;
        }

        // design decision: the 5 character header field determines the sentence type
        // this field could be handled in two different ways
        // 1. split it into the 2 character 'talker id' + 3 character 'sentence id' e.g. $GPGGA : talker=GP id=GGA
        //    this would leave more room for customization of proprietary talkers that give standard sentences,
        //    but it would be more complex to deal with
        // 2. handle it as a single 5 character id string
        //    much simpler.  for a proprietary talker + standard string, just instantiate the parser twice
        // This version implements approach #2
        id = tokens[0].substring(1);
        if(id.length !== 5) {
            this.error('i must be exactly 5 characters');
            return null;
        }

        // checksum format = *HH where HH are hex digits that convert to a 1 byte value
        if(checksum !== null) {
            // there is a checksum, replace the last token and verify the checksum
            status = utils.verifyChecksum(sentence, checksum);
            if(status === false) {
                this.error('checksum mismatch');
                return null;
            }
        }

        // try all id's until one matches
        result = null;
	/*
        for( i = 0; i < m_parserList.length; ++i) {
            if(id === m_parserList[i].id) {
                try {
                    result = m_parserList[i].parse(tokens);
                } catch(err) {
                    nmea.error(err.message);
                }
                break;
            }
        }*/
	
	if (parsers[id]) {
	  console.log(parsers[id]);
	  var obj = parsers[id];
	  result = {};
          for (var prop in obj) {
	    if (obj[prop].conditional) {
              if ( tokens[obj[prop].conditional.value] == obj[prop].conditional.equals) {
	        result[prop] = {};
	        result[prop].value = tokens[obj[prop].value];
	        result[prop].units = tokens[obj[prop].units];
	      }
	    } else {
	      result[prop] = {};
	      result[prop].value = tokens[obj[prop].value];
	      result[prop].units = tokens[obj[prop].units];
	    }
          }
	  console.log(result);
	}

        if(result === null) {
            this.error('sentence id not found');
        }
        return result;
    };

    nmea.error = function(msg) {
        if(m_errorHandler !== null) {
            // call the existing handler
            m_errorHandler(msg);
        }
    };

    /** public function to  set error handler */
    nmea.setErrorHandler = function(e) {
        m_errorHandler = e;
    };

    // =======================================================
    // initialize the handlers
    // =======================================================

    // add the standard error handler
    nmea.setErrorHandler(function(e) {
        throw new Error('ERROR:' + e);
    });

    // return the module object
    return nmea;
}());

module.exports = NMEA;
