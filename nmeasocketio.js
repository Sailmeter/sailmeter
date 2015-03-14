var webserver = require('config').Webserver;
var nmea = require('nmea-0183');
var url = require('url');
var fs = require('fs');
var utils = require("./utils.js");
var seriallistener = require('./seriallistener');

var http = require('http');

var server = http.createServer(function(request, response){
        var path = url.parse(request.url).pathname;

        switch(path){
            case '/':
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.write('AfterGuard');
                response.end();
                break;
            case '/jquery.js':
            case '/socket.html':
                fs.readFile(__dirname + path, function(error, data){
                    if (error){
                        response.writeHead(404);
                        response.write("opps this doesn't exist - 404");
                    }
                    else{
                        response.writeHead(200, {"Content-Type": "text/html"});
                        response.write(data, "utf8");
                    }
                    response.end();
                });
                break;
            case (path.match(/^\/countdown/) || {}).input:
                var parts = path.split("/");
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.write('countdown: ' + parts[2]);
                response.end();
                var countdown = {countdown: parts[2]};
                writeMsg(countdown);
                break;
            default:
                response.writeHead(404);
                response.write("opps this doesn't exist - 404");
                response.end();
                break;
        }
});

server.listen(webserver.port);

var serialPort = require("serialport");

var io = require('socket.io')(server);
setupSocketIO(function() {
    console.log("Ready");
});

function setupSocketIO(cb) {
//  io.configure( function() {
//    io.set('log level', 1)
//    io.set('close timeout', 60*60); // 1h time out
//    io.set('heartbeat timeout', 60*60); // 1h time out
//  });

  seriallistener.getSerialPorts(writeData);
  cb && cb();
}

function writeData(port, sentence) {
  try {
    console.log(port + ": " + new Date().toString() + ": " + sentence);
    var object = nmea.parse(sentence)
    var timestamp = Date.now();
    if ("apparent_wind_angle" in object && "reference" in object) {
      var obj1 = {};
      if (object.reference === "relative") {
        obj1 = {name: "AWA", value: object.apparent_wind_angle, units: "deg", timestamp: Date.now()};
      }
      else if (object.reference === "true") {
        obj1 = {name: "TWA", value: object.apparent_wind_angle, units: "deg", timestamp: Date.now()};
      }

      obj1.timestamp = timestamp;
      io.emit('nmea', JSON.stringify([obj1], null, 2));
    } 
    if ("apparent_wind_speed" in object && "units" in object) {
      var obj1 = {name: "AWS", value: object.apparent_wind_speed, units: object.units, timestamp: Date.now()};

      obj1.timestamp = timestamp;
      io.emit('nmea', JSON.stringify([obj1], null, 2));
    }
    if ("heading1" in object && "reference1" in object) {
      var obj1 = {};
      if (object.reference1 === "magnetic") {
        obj1 = {name: "BHM", value: object.heading1, units: "deg", timestamp: Date.now()};
      }
      else if (object.reference === "true") {
        obj1 = {name: "BHT", value: object.heading1, units: "deg", timestamp: Date.now()};
      }

      obj1.timestamp = timestamp;
      io.emit('nmea', JSON.stringify([obj1], null, 2));
    }
    if ("heading2" in object && "reference2" in object) {
      var obj1 = {};
      if (object.reference1 === "magnetic") {
        obj1 = {name: "BHM", value: object.heading1, units: "deg", timestamp: Date.now()};
      }
      else if (object.reference === "true") {
        obj1 = {name: "BHT", value: object.heading1, units: "deg", timestamp: Date.now()};
      }

      obj1.timestamp = timestamp;
      io.emit('nmea', JSON.stringify([obj1], null, 2));
    }
    if ("sow_knots" in object) {
      var obj1 = {};
      obj1 = {name: "BSP", value: object.sow_knots, units: "K", timestamp: Date.now()};

      obj1.timestamp = timestamp;
      io.emit('nmea', JSON.stringify([obj1], null, 2));
    }
    if ("sow_kph" in object) {
      var obj1 = {};
      obj1 = {name: "BSP", value: object.sow_kph, units: "kph", timestamp: Date.now()};

      obj1.timestamp = timestamp;
      io.emit('nmea', JSON.stringify([obj1], null, 2));
    }
    if ("latitude" in object && "longitude" in object) {
      // throw this away if no satellites were used.
      if (object.satellites) {
        var obj1 = {name: "LAT", value: object.latitude, timestamp: Date.now()};
        var obj2 = {name: "LON", value: object.longitude, timestamp: Date.now()};

        obj1.timestamp = timestamp;
        obj2.timestamp = timestamp;
        io.emit('nmea', JSON.stringify([obj1, obj2], null, 2));
      }
    } 
    if ("course" in object && "knots" in object) {
        var obj1 = {name: "SPD", value: object.knots, timestamp: Date.now()};
        var obj2 = {name: "CRS", value: object.course, timestamp: Date.now()};

        obj1.timestamp = timestamp;
        obj2.timestamp = timestamp;
        io.emit('nmea', JSON.stringify([obj1, obj2], null, 2));
    }
  } catch (exception) {
    console.log(sentence);
    console.log(exception);
  }
}



function portLogger(port) {

  var SerialPort = require("serialport").SerialPort
  var serialport = new SerialPort(port, {
    baudrate: 4800,
    parser: serialPort.parsers.readline("\n")
  }, false); // this is the openImmediately flag [default is true]

  serialport.open(function (error) {
    if ( error ) {
      console.log('failed to open: '+error);
    } else {
      var sentence = "";
      serialport.on('data', function(data) {
          checksum = data.split('*');
          if(checksum.length === 2) {
              // there is a checksum
              sentence = checksum[0];
              checksum = checksum[1];
          } else {
              checksum = null;
          }
          if (checksum && utils.verifyChecksum(sentence, checksum)) {
            //console.log(data);
            try {
              var object = nmea.parse(sentence)
              var timestamp = Date.now();
              if ("angle" in object && "speed" in object) {
                var obj1 = {name: "AWA", value: object.angle, units: object.reference, timestamp: Date.now()};
                var obj2 = {name: "BSP", value: object.speed, units: object.units, timestamp: Date.now()};
  
                obj1.timestamp = timestamp;
                obj2.timestamp = timestamp;
                io.emit('nmea', JSON.stringify([obj1, obj2], null, 2));
              } else if ("latitude" in object && "longitude" in object) {
                // throw this away if no satellites were used.
                if (object.satellites) {
                  var obj1 = {name: "LAT", value: object.latitude, timestamp: Date.now()};
                  var obj2 = {name: "LON", value: object.longitude, timestamp: Date.now()};
  
                  obj1.timestamp = timestamp;
                  obj2.timestamp = timestamp;
                  io.emit('nmea', JSON.stringify([obj1, obj2], null, 2));
                }
              } else if ("course" in object && "knots" in object) {
                  var obj1 = {name: "SPD", value: object.knots, timestamp: Date.now()};
                  var obj2 = {name: "CRS", value: object.course, timestamp: Date.now()};
  
                  obj1.timestamp = timestamp;
                  obj2.timestamp = timestamp;
                  io.emit('nmea', JSON.stringify([obj1, obj2], null, 2));
              } else {
                //console.log(object);
              }
            } catch (exception) {
              console.log(sentence);
              console.log(exception);
            }
          }
      });
    }
  });

}

function writeMsg(message) {
  io.emit('msg', JSON.stringify(message, null, 2));
}
