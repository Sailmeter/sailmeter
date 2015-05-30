var webserver = require('config').Webserver;
var nmea = require('./NMEA.js');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');
var LineByLineReader = require('line-by-line');
var utils = require("./utils.js");
var seriallistener = require('./seriallistener');
var ivector = require('./intersect');
var mime = require('mime');

var http = require('http');

var runningDemoMode = false;
var startDemoMode = false;
var filename = null;
var countdown = 0;

if (process.argv[2] == "-demo") {
  startDemoMode = true;
  filename = "nmeademo.txt";
}

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

function readFile(path, response) {
  fs.readFile(__dirname + path, function(error, data){
    if (error){
      response.writeHead(404);
      response.write("opps this doesn't exist - 404");
    }
    else {
      var mimetype = mime.lookup(__dirname + path);
      response.writeHead(200, {"Content-Type": mimetype});
      response.write(data, "utf8");
    }
    response.end();
  });
}

var server = http.createServer(function(request, response){
        var path = url.parse(request.url).pathname;

        switch(path){
            case '/':
	        readFile("/index.html", response);
                break;
            case (path.match(/\.css$/) || {}).input:
            case (path.match(/\.js$/) || {}).input:
            case (path.match(/\.html$/) || {}).input:
            case (path.match(/\.apk$/) || {}).input:
	        readFile(path, response);
                break;
            case '/demomode/start': 
	      filename = "nmeademo.txt";
              writeFileToSocketIO();
              response.writeHead(200, {"Content-Type": "text/html"});
              response.write("demomode started");
              response.end();
              break;
            case '/demomode/stop': 
              runningDemoMode = false;
              try {
                clearTimeout(writeTimeout);
              }
              catch(err) {
	      }
              response.writeHead(200, {"Content-Type": "text/html"});
              response.write("demomode stopped");
              response.end();
              break;
            case '/demostartmode/start': 
	      filename = "nmeastartdemo.txt";
              writeFileToSocketIO();
              response.writeHead(200, {"Content-Type": "text/html"});
              response.write("demostartmode started");
              response.end();
              break;
            case '/demostartmode/stop': 
              runningDemoMode = false;
              try {
                clearTimeout(writeTimeout);
              }
              catch(err) {
	      }
              response.writeHead(200, {"Content-Type": "text/html"});
              response.write("demostartmode stopped");
              response.end();
              break;
            case (path.match(/^\/startcountdown/) || {}).input:
                var parts = path.split("/");
                countdown = parts[2];
                if (countdown == parseInt(countdown, 10)) {
                  response.writeHead(200, {'Content-Type': 'text/html'});
                  response.write(JSON.stringify(countdown));
                  if (countdownTimeout != null) {
                    try {
                      clearTimeout(countdownTimeout);
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
	    case '/stopcountdown': 
                if (countdownTimeout != null) {
                  try {
                    clearTimeout(countdownTimeout);
                  }
                  catch(err) {
                  }
                }
		break;
            case (path.match(/^\/startlinefix/) || {}).input:
                var parts = path.split("/");
                response.writeHead(200, {'Content-Type': 'text/html'});
                var startlinefix = {latitude: parts[2], hemi: parts[3], longitude: parts[4], easting: parts[5], bearing: parts[6] };
                response.write(JSON.stringify(startlinefix));
                response.end();
                if (startlinefixTimeout != null) {
                  try {
                    clearTimeout(startlinefixTimeout);
                  }
                  catch(err) {
                  }
                }
		runStartLineFix(startlinefix);
                break;
	    case '/stoplinefix': 
                if (startlinefixTimeout != null) {
                  try {
                    clearTimeout(startlinefixTimeout);
                  }
                  catch(err) {
                  }
                }
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
		     fs.writeFileSync(__dirname + '/parsers.json', JSON.stringify(json, null, 4), 'utf8');
                     nmea.loadParsers();
                     response.writeHead(200, {"Content-Type": "text/html"});
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
            case '/admin/polars/show': 
		try {
		  var polars = JSON.parse(fs.readFileSync(__dirname + '/polars.json', 'utf8'));
                  response.writeHead(200, {"Content-Type": "text/html"});
                  response.write(JSON.stringify(polars));
		} catch (exception) {
                  response.writeHead(500, {'Content-Type': 'text/html'});
		  var error = {exception: exception.message};
                  response.write(JSON.stringify(error));
		} finally {
                  response.end();
		}
		break;
            case '/admin/polars/edit': 
                parsePost(request, function(data) {
		  var obj = querystring.parse(data);
		  try {
		     var json = JSON.parse(obj.polars);
		     fs.writeFileSync(__dirname + '/polars.json', JSON.stringify(json, null, 4), 'utf8');
                     response.writeHead(200, {"Content-Type": "text/html"});
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
  console.log("SocketIO Ready");
});

function setupSocketIO(cb) {
  if (! startDemoMode) {
     seriallistener.getSerialPorts(writeData);
  } else {
     writeFileToSocketIO();
     console.log("Starting in demo mode");
  }
  cb && cb();
}

var currentlat = null;
var currentlon = null;
var currentspeed = null;

function writeData(port, sentence) {
  try {
    console.log(port + ": " + new Date().toString() + ": " + sentence);
    var raw = {port: port, timestamp: Date.now(), sentence: sentence};
    io.emit('raw', JSON.stringify([raw], null, 2));
    var object = nmea.parse(sentence)
    object.timestamp = Date.now();
    io.emit('nmea', JSON.stringify([object], null, 2));
    if (object.BLA) {
      currentlat = object.BLA.value;
      if (object.BLA.units == "S") {
        currentlat = -1 * currentlat;
      }
    }
    if (object.BLO) {
      currentlon = object.BLO.value;
      if (object.BLO.units == "W") {
        currentlon = -1 * currentlon;
      }
    }
    if (object.BST) {
      currentspeed = object.BST.value;
    }
  } catch (exception) {
    var err = {port: port, timestamp: Date.now(), sentence: sentence, exception: exception.message};
    io.emit('err', JSON.stringify([err], null, 2));
    console.log("Error: " + port + ": " + new Date().toString() + ": " + sentence + " - " + exception.message);
  }
}

var countdownTimeout = null;

function runCountDown(countdown) {
  if (countdown >= 0) {
    io.emit('countdown', countdown); 
    countdownTimeout = setTimeout(
      function() { 
        runCountDown(--countdown);
      }, 
    1000);
  }
}

var startlinefixTimeout = null;

function runStartLineFix(startlinefix) {
  if (startlinefix && currentlat && currentlon && currentspeed) {
    var startpoint = {x: startlinefix.latitude, y: startlinefix.longitude};
    if (startlinefix.hemi == "S") {
      startpoint.x = -1 * startpoint.x;
    }
    if (startlinefix.easting == "W") {
      startpoint.y = -1 * startpoint.y;
    }
    var startline = ivector.getLine(startpoint, startlinefix.bearing, 1/3600);
    var distance = ivector.getDistance({x: currentlat, y: currentlon}, startline);
    io.emit('dtl', [distance]);
    if (countdown) {
      var timetokill = countdown - (distance / currentspeed)*3600;
      io.emit('ttk', [timetokill]); 
    }
    startlinefixTimeout = setTimeout(
      function() { 
        runStartLineFix(startlinefix);
      }, 
    1000);
  }
}

var writeTimeout = null;

function writeFileToSocketIO() {
  if (! runningDemoMode && filename) {
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
      writeTimeout = setTimeout(function() {
          stream.resume();
      }, 1000);
    });
  }
}

