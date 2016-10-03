var config = require('./get-config')();
var GetPath = require('./get-path');
var shelljs = require('shelljs');
var path = require('path');
var PathExists = require('./path-exists');
var glob = require('glob');

// dist, src, watch, standalone
var browserifyHelper = function(options) {
  ['.js', '.js.map'].forEach(function(ext) {
    var file = options.dist + ext;
    if (PathExists(file)) {
      shelljs.rm('-rf', options.dist + ext);
    }
  });
  var oldSilent = shelljs.config.silent;
  shelljs.mkdir('-p', path.dirname(options.dist));

  shelljs.config.silent = true;
  shelljs.pushd(path.join(__dirname, '..', '..'));
  shelljs.config.silent = oldSilent;

  var babelPreset = config.ie8 ? GetPath('babel-preset-ie8.config.js') : GetPath('babel-preset.config.js');
  var files = [options.src];

  if (!PathExists(options.src)) {
    files = glob.sync(options.src, {ignore: '**/node_modules/**'});
  }

  var browserify = (options.watch ? GetPath('watchify') + ' -v' : GetPath('browserify'))
    + ' --debug'
    + ' -t rollupify'
    + ' -t [ babelify --presets ' + babelPreset + ' ]'
    + ' -g browserify-shim'
    + ' -g browserify-versionify'
    + ' -p bundle-collapser/plugin'
    + (options.standalone ? ' -s ' + config.name : '')
    + ' -o ' + options.dist + '.js'
    + ' ' + files.join(' ');

  var retval = shelljs
    .exec(browserify, {silent: true});

  // remove rollup external deps errors...
  retval.stderr = retval.stderr || '';
  retval.stderr = retval.split(/^Treating '\w+' as external dependency\n$/).join('');

  if (retval.stderr) {
    process.stderr.write(retval.stderr);
  }

  // rip sourcemap out
  if (!options.watch) {
    shelljs.cat(options.dist + '.js')
      .exec(GetPath('exorcist') + " '" + options.dist + ".js.map'", {silent: true})
      .to(options.dist + '.js');
  }

  shelljs.config.silent = true;
  shelljs.popd();
  shelljs.config.silent = oldSilent;
  return retval;
};

module.exports = browserifyHelper;
