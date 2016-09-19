/* jshint node:true, es3:false */
/* eslint no-console:0 */

"use strict";
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { Transform } = require('stream');

const map = function (iterator) {
  const transform = new Transform();
  transform._readableState.objectMode = true;
  transform._writableState.objectMode = true;
  transform._transform = (obj, encoding, next) => {
    if (!iterator) return next(null, obj);
    if (iterator.length > 1) {
      iterator(obj, next);
    } else {
      next(null, iterator(obj));
    }
  };
  return transform;
};

const freeze = (obj, done) => done(null, Object.freeze(obj));
const pass = (obj, done) => done(null, obj); 
const hash = (obj, done) => {
  if(!obj.stats.isFile()) {
    return done(null, obj);
  }
 
  const rs = fs.createReadStream(obj.path);
  const hash = crypto.createHash('md5').setEncoding('hex');
  
  rs.on('end', () => {
    hash.end();
    return done(null, Object.freeze(Object.assign({}, obj, { hash: hash.read() })));
  });

  rs.pipe(hash);
  
  return hash;
};  

const copy = (obj, done) => {
      
  if(obj.stats.isDirectory() && obj.dest) {
    return fs.ensureDir(obj.dest, err => done(err, obj));
  }
  
  if(obj.stats.isFile() && obj.dest) {
    return fs.copy(obj.path, obj.dest, { clobber: true, preserveTimestamps:true }, err => done(err, obj));
  }

  return done(null, obj);
}

const rename = (obj, done) => {
  if(obj.hash) {
    const { root, dir, ext, name, base } = path.parse(obj.dest);

    if(base.includes(obj.hash)) {
      return done(null, obj);
    }
    const dest = path.format({
        root,
        dir,
        ext,
        name: name.includes('.')?`${name.substr(0, name.indexOf('.'))}.${obj.hash}${name.substr(name.indexOf('.'))}`:`${name}.${obj.hash}`
    });
  
    return done(null, Object.freeze(Object.assign({}, obj, { dest })));
  } else {
    return done(null, obj);
  }
};

module.exports = function (source, target, options, callback) {
  
  if (typeof options === 'function' && !callback) {
    callback = options
    options = {}
  }
  callback = callback || function () {}
  options = options || {} 
 
  const sourceRoot = path.resolve(source);  
  const targetRoot = path.resolve(target);
  const result = {}
  fs.walk(source)
    .pipe(map(freeze))
    .pipe(map((obj, done) => {
      return done(null, Object.freeze(Object.assign(
        {},
        obj,
        {
        dest: path.join(targetRoot, path.relative(sourceRoot, obj.path)) 
        }
      )));
    }))
    .pipe(map(hash))
    .pipe(map(rename))
    .pipe(map(options['dry-run']?pass:copy))
    .on('data', obj => {
      if(obj.stats.isFile()) {
        const key = path.relative(sourceRoot, obj.path);
        const val = path.relative(targetRoot, obj.dest);
        result[key] = val; 
      }
    })
    .on('end', () => {
      callback(null, result);
    });
}

