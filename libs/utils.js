/**
 * make callback function to promise
 * @param  {Function} fn       []
 * @param  {Object}   receiver []
 * @return {Promise}            []
 */
 const promisify = (fn, receiver) => {
    return (...args) => {
      return new Promise((resolve, reject) => {
        fn.apply(receiver, [...args, (err, res) => {
          return err ? reject(err) : resolve(res);
        }]);
      });
    };
  }
  
  module.exports = {
    promisify
  };