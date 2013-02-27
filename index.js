var restify = require('restify'),
    colors = require('colors'),
    assert = require('assert'),
    querystring = require('querystring');

var cupidon = require('./cupidon');

var Histoire = function(opts) {
  opts.matcher = cupidon.match;

  this.opts = opts;
  this.chapters = [];
  this.responses = {};

  this.opts.path = this.opts.path || '';

  this.client = restify.createJsonClient({
    url: opts.url,
    version: '*'
  });
};

function evaluate(data, context) {
  if (typeof data == 'string' || typeof data == 'number' || typeof data == 'boolean') {
    return data;
  } else if (typeof data == 'function') {
    return data(context);
  } else if (data instanceof Array) {
    return data.map(function(value) {
      return evaluate(value, context);
    });
  } else {
    Object.getOwnPropertyNames(data).forEach(function(key) {
      data[key] = evaluate(data[key], context);
    });
    return data;
  }
};

Histoire.prototype = {
  chapter: function(chapter) {
    chapter.withStatus = chapter.withStatus || 200;
    this.chapters.push(chapter);
  },

  metsTesLunettesEtLisNousTout: function() {
    var self = this;

    var next = function(i) {
      if (i >= self.chapters.length) return;
      
      var chapter = self.chapters[i];

      var callback = function(err, req, res, data) {
        // if (err) {
        //   console.log('ERROR');
        //   console.log(JSON.stringify(err, undefined, 2));
        //   throw(err);
        // }

        if (chapter.id !== undefined) {
          self.responses[chapter.id] = data;
        }
        var goodStatus = (chapter.withStatus == res.statusCode);
        if (data !== undefined) {
          console.log('->');
          console.log(('' + res.statusCode)[goodStatus ? 'green' : 'red']);
          console.log(JSON.stringify(data, undefined, 2));
        }
        console.log();
        assert.ok(goodStatus);
        if (chapter.expect !== undefined) {
          assert.ok(self.opts.matcher(data, chapter.expect, self.responses));
        }
        if (chapter.andWait !== undefined) {
          setTimeout(function() { next(i + 1); }, chapter.andWait);
        } else {
          next(i + 1);
        }
      };

      if (chapter.topic !== undefined) {
        console.log(chapter.topic.yellow);
      }
      if (chapter.type == 'GET' || chapter.type == 'DELETE') {
        var path = evaluate(chapter.path, self.responses);
        console.log(chapter.type + ' ' + path);
        var params = chapter.params;
        if (params) console.log(JSON.stringify(params, undefined, 2));
        var query = self.opts.path + path + (
          (!params)
            ? ''
            : ('?' + querystring.stringify(params))
        );
        if (chapter.type == 'GET') {
          self.client.get(query, callback);
        } else {
          self.client.del({
            path: query,
            headers: {
              'Content-Length': 0
            }
          }, callback);
        }
      } else if (chapter.type == 'POST' || chapter.type == 'PUT') {
        var path = evaluate(chapter.path, self.responses);
        console.log(chapter.type + ' ' + path);
        var opts = {
          path: self.opts.path + path
        };
        if (chapter.headers !== undefined) {
          console.log(JSON.stringify(chapter.headers, undefined, 2).grey);
          opts.headers = evaluate(chapter.headers, self.responses);
        }
        var data = evaluate(chapter.data || {}, self.responses);
        console.log(JSON.stringify(data, undefined, 2));
        self.client[chapter.type == 'POST' ? 'post' : 'put'](opts, data, callback);
      } else if (chapter.type == 'WAIT') {
        console.log('WAIT ' + chapter.duration + 'ms');
        setTimeout(function() { next(i + 1); }, chapter.duration);
      }
    };

    next(0);
  }
};

module.exports = {
  raconteNousUneHistoire: function(opts) {
    return new Histoire(opts);
  },

  any: cupidon.any
};

