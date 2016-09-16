const assert = require('chai').assert;
const copy = require('../index');
const path = require('path');

describe('md5-copy', () => { 

  it('should copy add md5 hash to file name', done => {
    const src = path.join(__dirname, 'fixtures');
    const dst = path.join(__dirname, 'fixtures.md5');
    copy(src, dst, { 'dry-run':true }, (err, report) => {
      
      const actual = JSON.stringify({
        "file":"file.bbe02f946d5455d74616fc9777557c22",
        "file.772ac1a55fab1122f3b369ee9cd31549.md5":"file.772ac1a55fab1122f3b369ee9cd31549.md5",
        "file.jpg":"file.fd572d254505950d798c4e1b550ad903.jpg",
        "file.txt":"file.e22d8dd40a886dd786ccce0a35a6e4a9.txt"
      });
      
      const expected = JSON.stringify(report);

      assert.equal(expected, actual); 
      return done();

    });
  });
  
});

