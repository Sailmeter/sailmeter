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
    result.WSA.should.eql({ value: '5.36', units: 'N' });
    result.WAT.should.eql({ value: '41.4', units: 'C' });
    result.WST.should.eql({ value: '5.36', units: 'N' });
    done();
  });
  it("parse IIVHW", function(done) {
    result = nmea.parse("$IIVHW,184.0,T,172.0,M,3.45,N.4.56,K*5B");
    result.BHM.should.eql({ value: '172.0', units: '0' });
    result.BST.should.eql({ value: '3.45', units: 'N' });
    done();
  });
  it("parse GPVTG", function(done) {
    result = nmea.parse("$GPVTG,184.0,T,172.0,M,3.54,N,4.65,K,m*03");
    result.BHT.should.eql({ value: '184.0', units: 'T' });
    result.BHM.should.eql({ value: '172.0', units: '0' });
    result.SOG.should.eql({ value: '3.54', units: 'N' });
    done();
  });
  it("parse VWVHW", function(done) {
    result = nmea.parse("$VWVHW,234.41,M,214.41,T,3.22,5.97*5B");
    result.BHM.should.eql({ value: '214.41', units: '0' });
    result.BHT.should.eql({ value: '234.41', units: 'M' });
    result.BST.should.eql({ value: '3.22', units: 'N' });
    done();
  });
  it("parse GPGGA", function(done) {
    result = nmea.parse("$GPGGA,204436.000,4902.0219,N,12303.3771,W,1,09,0.9,7.2,M,-16.9,M,,0000*6B");
    result.BLA.should.eql({ value: '49.03369833', units: 'N' });
    result.BLO.should.eql({ value: '-123.05628500', units: 'W' });
    done();
  });
  it("parse GPRMC", function(done) {
    result = nmea.parse("$GPRMC,204436.000,A,4902.0219,N,12303.3771,W,0.00,177.82,081115,,,A*78");
    result.BLA.should.eql({ value: '49.03369833', units: 'N' });
    result.BLO.should.eql({ value: '-123.05628500', units: 'W' });
    result.BST.should.eql({ value: '0.00', units: 'N' });
    result.BHM.should.eql({ value: '177.82', units: 'T' });
    done();
  });
});

