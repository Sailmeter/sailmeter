var serialPort = require("serialport");

var utils = require("./utils.js");

var runningPorts = {};

function getSerialPorts() {
  serialPort.list(function (err, ports) {
    if (err) {
      console.log("ERR: " + err);
    } else {
      ports.forEach(function(port) {
        if (! runningPorts[port.comName] && runningPorts[port.comName] == null) {
          console.log("Port: " + port.comName);
          console.log("Driver: " + port.pnpId);
          console.log("Manufacturer: " + port.manufacturer);
          portLogger(port.comName);
        }
      });
    }
  });
}

function disconnectSerialPort(port) {
  console.log("Disconnected: " + port);
  runningPorts[port].close(function(err) {
    console.log("ERR: " + err);
    runningPorts[port] = null;
    getSerialPorts();
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
      runningPorts[port] = serialport; 
      var disconnectTimeout = setTimeout(function() { disconnectSerialPort(port) }, 2000);
      var sentence = "";
      serialport.on('data', function(data) {
          clearTimeout(disconnectTimeout);
          checksum = data.split('*');
          if(checksum.length === 2) {
              // there is a checksum
              sentence = checksum[0];
              checksum = checksum[1];
          } else {
              checksum = null;
          }
          if (checksum && utils.verifyChecksum(sentence, checksum)) {
            console.log(new Date().toString() + ": " + data);
          }
          disconnectTimeout = setTimeout(function() { disconnectSerialPort(port) }, 2000);
      });
    }
  });

  serialport.on('disconnect', function (err) {
    console.log('on.disconnect');
  });

  serialport.on('close', function(){
    console.log('on.close');
  });

  serialport.on('error', function (err) {
    console.error("error", err);
  });

}

setInterval(function() {
  getSerialPorts();
}, 5000);

getSerialPorts();

