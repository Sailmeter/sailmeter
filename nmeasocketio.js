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
var LatLong = require('./latlon-spherical');

var http = require('http');

var runningDemoMode = false;
var startDemoMode = false;
var filename = null;
var countdown = 0;

var startlinepoint = null;
var endlinepoint = null;
var startlinebearing = null;

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
                console.log("clearTimeout(writeTimeout): " + err);
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
	      startlinefix = 0;
              try {
                clearTimeout(writeTimeout);
              }
              catch(err) {
                console.log("clearTimeout(writeTimeout): " + err);
	      }
              try {
                 clearTimeout(startlinefixTimeout);
              }
              catch(err) {
                console.log("clearTimeout(startlinefixTimeout): " + err);
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
                      console.log("clearTimeout(countdownTimeout): " + err);
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
                response.writeHead(200, {'Content-Type': 'text/html'});
                if (countdownTimeout != null) {
                  try {
                    clearTimeout(countdownTimeout);
                  }
                  catch(err) {
                    console.log("clearTimeout(countdownTimeout): " + err);
                  }
                }
		response.write("stopped countdown");
                response.end();
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
                    console.log("clearTimeout(startlinefixTimeout): " + err);
                  }
                }
                startlinepoint = new LatLong(startlinefix.latitude, startlinefix.longitude);
                endlinepoint = startlinepoint.destinationPoint(100, startlinefix.bearing);
		startlinebearing = startlinefix.bearing;
		runStartLineFix();
                break;
	    case '/stoplinefix': 
                response.writeHead(200, {'Content-Type': 'text/html'});
                if (startlinefixTimeout != null) {
                  try {
                    clearTimeout(startlinefixTimeout);
                  }
                  catch(err) {
                    console.log("clearTimeout(startlinefixTimeout): " + err);
                  }
                }
		response.write("stopped linefix");
                response.end();
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
    //console.log(port + ": " + new Date().toString() + ": " + sentence);
    var raw = {port: port, timestamp: Date.now(), sentence: sentence};
    io.emit('raw', JSON.stringify([raw], null, 2));
    var object = nmea.parse(sentence)
    object.timestamp = Date.now();
    io.emit('nmea', JSON.stringify([object], null, 2));
    if (object.BLA) {
      currentlat = object.BLA.value;
    }
    if (object.BLO) {
      currentlon = object.BLO.value;
    }
    if (object.SOG) {
      currentspeed = object.SOG.value;
    }
    if (object.BHT) {
      courseoverground = object.BHT.value;
    }
  } catch (exception) {
    var err = {port: port, timestamp: Date.now(), sentence: sentence, exception: exception.message};
    io.emit('err', JSON.stringify([err], null, 2));
    console.log("Error: " + port + ": " + new Date().toString() + ": " + sentence + " - " + exception.message);
  }
}

var countdownTimeout = null;

function runCountDown() {
  if (countdown >= 0) {
    io.emit('countdown', countdown); 
    countdownTimeout = setTimeout(
      function() { 
	countdown--;
        runCountDown();
      }, 
    1000);
  }
}

var startlinefixTimeout = null;

function runStartLineFix() {
  clearTimeout(startlinefixTimeout);
  if (startlinepoint && endlinepoint && startlinebearing && currentlat && currentlon) {
    try {
      var currentpoint = new LatLong(currentlat, currentlon);
      var distance = Math.abs(currentpoint.crossTrackDistanceTo(startlinepoint, endlinepoint));
  
      io.emit('dtl', [distance]); // convert dtl into meters

      if (countdown) {
          //var timetokill = countdown - ((distance/1852) / currentspeed)*3600;
	  var angletoline = Math.abs(courseoverground - startlinebearing);
	  if (angletoline > 90) {
	    angletoline = 180 - angletoline;
	  }
	  var vmg = currentspeed * Math.cos(angletoline * (Math.PI / 180));
	  if (vmg == 0) {
            io.emit('ttk', ['-1']); 
	  } else {
  	    var timetokill = distance / vmg;
            io.emit('ttk', [timetokill]); 
	  }
      }
    } catch(err) {
      console.log("runStartLineFix: " + err);
    }
    startlinefixTimeout = setTimeout(
      function() { 
        runStartLineFix();
      }, 
    500);
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
        },500);			
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
      }, 500);
    });
  }
}

