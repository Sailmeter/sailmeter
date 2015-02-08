var serialPort = require("serialport");
serialPort.list(function (err, ports) {
  if (err) {
    throw err;
  }
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
});

var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyUSB0", {
  baudrate: 4800
}, false); // this is the openImmediately flag [default is true]

serialPort.open(function (error) {
  if ( error ) {
    console.log('failed to open: '+error);
  } else {
    //console.log('open');
    serialPort.on('data', function(data) {
      console.log('data received: ' + data);
    });
    //serialPort.write("ls\n", function(err, results) {
    //  if (err) {
    //    console.log('failed to write: ' + err);
    //  }
    //  console.log('results ' + results);
    //});
  }
});
