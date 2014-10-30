

var config = require('./config.json');


module.exports.config = config;

module.exports.exec = function (App) {

  var categories = App.getCollection('Categories');

  return categories.fetch({columns: ['slug', 'name']})
  .then(function (collection) {
    
    return collection;
  });
};


