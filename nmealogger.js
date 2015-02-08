var seriallistener = require('./seriallistener');

function log(port, data) {
  console.log(port + ": " + new Date().toString() + ": " + data);
}

seriallistener.getSerialPorts(log);
