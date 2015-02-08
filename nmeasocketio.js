var webserver = require('config').Webserver;
var nmea = require('nmea-0183');
var url = require('url');
var fs = require('fs');
var utils = require("./utils.js");

var http = require('http');

var server = http.createServer(function(request, response){
        console.log('Connection');
        var path = url.parse(request.url).pathname;

        switch(path){
            case '/':
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.write('hello world');
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

  setupSerialPorts();
  cb && cb();
}


function setupSerialPorts(cb) {
  serialPort.list(function (err, ports) {
    if (err) {
      throw err;
    }
    ports.forEach(function(port) {
      console.log("Port: " + port.comName);
      console.log("Driver: " + port.pnpId);
      console.log("Manufacturer: " + port.manufacturer);
      portLogger(port.comName);
    });

  });
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
