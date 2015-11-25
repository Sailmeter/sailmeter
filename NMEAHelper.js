// function from https://github.com/nherment/node-nmea
module.exports = {
    // decode latitude
    // input : latitude in nmea format
    //      first two digits are degress
    //      rest of digits are decimal minutes
    // output : latitude in decimal degrees
    parseLatitude: function(lat, hemi) {
      var h = (hemi === 'N') ? 1.0 : -1.0;
      var a;
      var dg;
      var mn;
      var l;
      a = lat.split('.');
      if(a[0].length === 4) {
        // two digits of degrees
        dg = lat.substring(0, 2);
        mn = lat.substring(2);
      } else if(a[0].length === 3) {
        // 1 digit of degrees (in case no leading zero)
        dg = lat.substring(0, 1);
        mn = lat.substring(1);
      } else {
        // no degrees, just minutes (nonstandard but a buggy unit might do this)
        dg = '0';
        mn = lat;
      }
      // latitude is usually precise to 5-8 digits
      return ((parseFloat(dg) + (parseFloat(mn) / 60.0)) * h).toFixed(8);
    },

    // decode longitude
    // first three digits are degress
    // rest of digits are decimal minutes
    parseLongitude: function(lon, hemi) {
      var h;
      var a;
      var dg;
      var mn;
      h = (hemi === 'E') ? 1.0 : -1.0;
      a = lon.split('.');
      if(a[0].length === 5) {
        // three digits of degrees
        dg = lon.substring(0, 3);
        mn = lon.substring(3);
      } else if(a[0].length === 4) {
        // 2 digits of degrees (in case no leading zero)
        dg = lon.substring(0, 2);
        mn = lon.substring(2);
      } else if(a[0].length === 3) {
        // 1 digit of degrees (in case no leading zero)
        dg = lon.substring(0, 1);
        mn = lon.substring(1);
      } else {
        // no degrees, just minutes (nonstandard but a buggy unit might do this)
        dg = '0';
        mn = lon;
      }
      // longitude is usually precise to 5-8 digits
      return ((parseFloat(dg) + (parseFloat(mn) / 60.0)) * h).toFixed(8);
   }

}
