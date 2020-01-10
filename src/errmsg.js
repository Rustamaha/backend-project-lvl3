const errno = require('errno');

const errmsg = (err) => {
  let str = 'Error: ';
  if (errno.errno[err.errno]) {
    str += errno.errno[err.errno].description;
  } else {
    str += err.message;
  }
  if (err.path) {
    str += ` [ ${err.path} ]`;
  }
  return str;
};

export default errmsg;
