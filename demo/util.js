// find url parameter by name.
// @return string
function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

// binary search through array
Array.prototype.binarySearch = function(find, field) {
  var low = 0, high = this.length - 1,
      i, comparison;
  while (low <= high) {
    i = Math.floor((low + high) / 2);
    if (this[i][field] < find) { low = i + 1; continue; };
    if (this[i][field] > find) { high = i - 1; continue; };
    return i;
  }
  return i;
};

function getUrlVars() {
    var prmstr = window.location.search.substr(1);
    var prmarr = prmstr.split ("&");
    var params = {};

    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }

    return params;
}
