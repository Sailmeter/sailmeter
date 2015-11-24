/*jshint expr: true*/

var should = require('should'); 
var assert = require('assert');

var intersect = require('../intersect.js');


describe("StartLine", function(){  
  it("45 degree line", function(done){    
    var startpoint = {x:0, y:0};
    var line = intersect.getLine(startpoint, 45, Math.sqrt(2));	 
    line.start.should.eql(startpoint);
    line.end.should.eql({x: 1.0000, y: 1.0000});
    done();
  });

  it("distance of 1", function(done){    
    var startpoint = {x:0, y:0};
    var line = intersect.getLine(startpoint, 45, Math.sqrt(2));	 
    var point = {x: Math.sqrt(2), y: 0};
    var distance =  intersect.getDistance(point, line);
    distance.should.eql(1);
    done();
  });

  it("point on the line", function(done){    
    var startpoint = {x:0, y:0};
    var line = intersect.getLine(startpoint, 45, Math.sqrt(2));	 
    var point = {x: 0, y: 0};
    var distance =  intersect.getDistance(point, line);
    distance.should.eql(0);
    done();
  });
});


