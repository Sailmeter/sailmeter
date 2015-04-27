var webserver = require('config').Webserver;
var nmea = require('./NMEA.js');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');
var LineByLineReader = require('line-by-line');
var utils = require("./utils.js");
var seriallistener = require('./seriallistener');

var http = require('http');

var runningDemoMode = false;

nmea.loadParsers();

function parsePost(req, callback) {
  var data = '';
  req.on('data', function(chunk) {
    data += chunk;
  });
  req.on('end', function() {
    callback(data);
  });
}

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
            case '/admin.html':
            case '/admin/parsers/index.html':
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
            case '/demomode/start': 
              writeFileToSocketIO();
              response.writeHead(200, {"Content-Type": "text/html"});
              response.write("demomode started");
              response.end();
              break;
            case '/demomode/stop': 
              runningDemoMode = false;
              response.writeHead(200, {"Content-Type": "text/html"});
              response.write("demomode stopped");
              response.end();
              break;
            case (path.match(/^\/startcountdown/) || {}).input:
                var parts = path.split("/");
                var countdown = parts[2];
                if (countdown == parseInt(countdown, 10)) {
                  response.writeHead(200, {'Content-Type': 'text/html'});
                  response.write(JSON.stringify(countdown));
                  if (currentTimeout != null) {
                    try {
                      clearTimeout(currentTimeout);
                    }
                    catch(err) {
                    }
                  }
                  runCountDown(countdown);
                } else {
                  var error = {error: "Not an Integer: " + parts[2]};
                  response.writeHead(500, {'Content-Type': 'text/html'});
                  response.write(JSON.stringify(error));
                }
                response.end();
                break;
            case (path.match(/^\/startlinefix/) || {}).input:
                var parts = path.split("/");
                response.writeHead(200, {'Content-Type': 'text/html'});
                var startlinefix = {latitude: parts[2], hemi: parts[3], longitude: parts[4], easting: parts[5], bearing: parts[6] };
                response.write(JSON.stringify(startlinefix));
                response.end();
                writeMsg(startlinefix);
                break;
            case '/admin/parsers/show': 
		try {
		  var parsers = JSON.parse(fs.readFileSync(__dirname + '/parsers.json', 'utf8'));
                  response.writeHead(200, {"Content-Type": "text/html"});
                  response.write(JSON.stringify(parsers));
		} catch (exception) {
                  response.writeHead(500, {'Content-Type': 'text/html'});
		  var error = {exception: exception.message};
                  response.write(JSON.stringify(error));
		} finally {
                  response.end();
		}
		break;
            case '/admin/parsers/edit': 
                parsePost(request, function(data) {
		  var obj = querystring.parse(data);
		  try {
		     var json = JSON.parse(obj.parsers);
                     response.writeHead(200, {"Content-Type": "text/html"});
		     fs.writeFileSync(__dirname + '/parsers.json', JSON.stringify(json, null, 4), 'utf8');
                     response.write("file received");
		  } catch (exception) {
                    response.writeHead(500, {'Content-Type': 'text/html'});
		    var error = {exception: exception.message};
                    response.write(JSON.stringify(error));
		  } finally {
                    response.end();
		  }
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

//  seriallistener.getSerialPorts(writeData);
  cb && cb();
}

function writeData(port, sentence) {
  try {
    console.log(port + ": " + new Date().toString() + ": " + sentence);
    var raw = {port: port, timestamp: Date.now(), sentence: sentence};
    io.emit('raw', JSON.stringify([raw], null, 2));
    var object = nmea.parse(sentence)
    object.timestamp = Date.now();
    io.emit('nmea', JSON.stringify([object], null, 2));
  } catch (exception) {
    var err = {port: port, timestamp: Date.now(), sentence: sentence, exception: exception.message};
    io.emit('err', JSON.stringify([err], null, 2));
    console.log("Error: " + port + ": " + new Date().toString() + ": " + sentence + " - " + exception.message);
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
              var error = {sentense: sentense, message: exception};
              console.log(JSON.stringify(error));
            }
          }
      });
    }
  });

}

function writeMsg(message) {
  io.emit('msg', JSON.stringify(message, null, 2));
}

var currentTimeout = null;

function runCountDown(countdown) {
  if (countdown >= 0) {
    io.emit('countdown', countdown); 
    currentTimeout = setTimeout(
      function() { 
        runCountDown(--countdown);
      }, 
    1000);
  }
}

var filename = 'nmeademo.txt';

function writeFileToSocketIO() {
  if (! runningDemoMode) {
    runningDemoMode = true;
    var stream = new LineByLineReader(filename);
    stream.on('end', function() {
      if (runningDemoMode) {
        runningDemoMode = false;
        setTimeout(function() {
        writeFileToSocketIO();
        },1000);			
      }
    });
    stream.on('error', function(err) {
      console.log(err);
    });
    stream.on('line', function(line) {
      stream.pause();
      if (runningDemoMode) {
        writeData('demo', line);
      }
      var timer = setTimeout(function() {
          stream.resume();
      }, 1000);
    });
  }
}

