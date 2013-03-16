var match = function(result, expected, context) {
  if (result === undefined) return expected === undefined;

  if (typeof expected == 'string' || typeof expected == 'number' || typeof expected == 'boolean' || expected == null) {
    return result == expected;
  } else if (typeof expected == 'function') {
    return expected(result, context);
  } else if (expected instanceof Array) {
    console.log(expected);

    if (!result || !(result instanceof Array)) return false;

    var available = [].concat(result);

    var ok = true;
    expected.forEach(function(item, idx) {
      var foundIdx = undefined;

      available.forEach(function(ritem, ridx) {
        if (foundIdx === undefined && match(ritem, item, context)) {
          foundIdx = ridx;
        }
      });

      if (foundIdx === undefined) {
        ok = false;
      } else {
        available.splice(foundIdx, 1);
      }
    });

    return ok;
  } else {
    var ok = true;
    Object.getOwnPropertyNames(expected).forEach(function(key) {
      if (!match(result[key], expected[key], context)) {
        console.log(key + ' does not match', result,  expected);
        ok = false;
      }
    });

    return ok;
  }
};

module.exports = {
  match: match,

  any: function(v) {
    return (v !== undefined);
  },

  item: function(i, m) {
    return function(a) {
      return match(a[i], m);
    };
  },

  property: function(n, m) {
    return function(o) { 
      return match(o[n], m);
    };
  },

  and: function(a, b) {
    return function(v) {
      return match(v, a) && match(v, b);
    }
  },

  len: function(len) {
    return function(v) {
      return v.length == len;
    }
  }
};

