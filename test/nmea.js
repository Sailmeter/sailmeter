/*jshint expr: true*/

var should = require('should'); 
var assert = require('assert');

var nmea = require('../NMEA.js');


describe("NMEA", function(){  
  it("load parser file", function(done){    
    nmea.loadParsers();   
    done();    
  });
  it("parse IIVWR", function(done) {
    result = nmea.parse("$IIVWR,25.4,R,8.27,N,4.25,M,15.3,K*43");
    result.should.be.ok;
    result.WAA.should.be.ok;
    result.WAA.value.should.equal('25.4');
    result.WAA.units.should.equal('R');
    result.WSA.should.be.ok;
    result.WSA.value.should.equal('8.27');
    result.WSA.units.should.equal('N');
    
    done();
  });
  it("parse IIMWV", function(done) {
    result = nmea.parse("$IIMWV,41.4,T,5.36,N*57");
    result.should.be.ok;
    done();
  });
  it("parse IIVHW", function(done) {
    result = nmea.parse("$IIVHW,184.0,T,172.0,M,3.45,N.4.56,K*5B");
    result.should.be.ok;
    done();
  });
  it("parse GPVTG", function(done) {
    result = nmea.parse("$GPVTG,184.0,T,172.0,M,3.54,N,4.65,K,m*03");
    result.should.be.ok;
    done();
  });
  it("parse VWVHW", function(done) {
    result = nmea.parse("$VWVHW,234.41,M,214.41,T,3.22,5.97*5B");
    result.should.be.ok;
    done();
  });
});

