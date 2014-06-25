/**
 * Module dependencies.
 */

var Base  = require('./base');
var moment = require('moment');


var Event = Base.Model.extend({

  tableName: 'events',


  hasTimestamps: true,


  /**
   * parses date
   */
  parseDate: function (fmt) {
  	var dt = this.get('dt');

    return moment(dt).format(fmt || 'ddd MMM D YYYY');
  },


  viewed: function () {
    var views = this.get('views');

    this.set('views', views + 1);

    return this.save();
  },


  /**
   * Checks if its future event
   */
  isUpComing: function () {
    var dt = this.get('dt');
    var ts = this.get('start_time');

    var cleandate = moment(dt).format('YYYY-MM-DD') + ' ' + ts;

    return moment(cleandate).unix() > moment().unix();
  },


  /**
   * parses time
   */
  parseTime: function (fmt) {
  	var ts = this.get('start_time');

    return moment(ts, 'HH:mm:ss').format(fmt || 'HH:mm');
  }
});



module.exports = Base.model('Event', Event);
