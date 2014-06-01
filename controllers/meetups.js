
var Meetup = require('../models/meetup');
var Meetups = require('../collections/meetups');



module.exports = {

  /*
   * GET /meetups/new
   * load new meetup page
   */
  newMeetup: function (req, res) {
    res.render('newmeetup', {
      title: 'New Meetup'
    });
  },


  /*
   * Post /meetups/limit
   * sets the limit for the number of meetups per page
   */
  setLimit: function (req, res) {
    req.session.elimit = req.body.limit;
    res.redirect('/meetups');
  },


  /*
   * GET /meetups/:id
   * loads an meetup by id
   */
  getMeetup: function (req, res) {
    var id = req.params.id;

    Meetup.forge({id: id})
    .fetch()
    .then(function (meetup) {
      if(!meetup) return res.redirect('/meetups');

      var views = meetup.get('views');

      meetup.set({views: views + 1});

      res.render('meetup', {
        title: 'Meetup',
        meetup: meetup
      });

      meetup.save()
      .then(function () {})
      .otherwise(function () {});
    })
    .otherwise(function () {
      res.redirect('/meetups');
    });
  },



  /**
   * GET /meetups
   * get upcoming meetups
   */
  getMeetups: function (req, res, next) {
    var meetups = new Meetups();
  
    meetups.fetchItems()
    .then(function (collection) {
      res.render('meetups', {
        title: 'Find Meetups',
        meetups: collection.models,
        pagination: collection.pagination,
        query: {}
      });
    })
    .otherwise(function () {
      req.flash('errors', {'msg': 'Database error. Could not fetch meetups.'});
      res.redirect('/');      
    });
  },


  /*
   * POST /meetups/new
   * create an meetup
   */
  postNewMeetup: function (req, res) {
    req.assert('title', 'Name must be at least 4 characters long').len(4);
    req.assert('desc', 'Details must be at least 12 characters long').len(12);
    req.assert('email', 'Starting cannot be blank').isEmail();
    req.assert('administrative_area_level_1', 'Please make sure location is showing in map').notEmpty();
  
    var errors = req.validationErrors();
    var meetupData = {};
    var user = req.user;
  
    if (errors) {
      req.flash('errors', errors);
      return res.redirect('/meetups/new');
    }

    meetupData.user_id = user.get('id');
    meetupData.name = req.body.title;
    meetupData.organiser = req.body.organiser;
    meetupData.desc = req.body.desc;
    meetupData.province = req.body.administrative_area_level_1;
    meetupData.lat = req.body.lat;
    meetupData.lng = req.body.lng;
    meetupData.city = req.body.locality;
    meetupData.town = req.body.sublocality;
    meetupData.address = req.body.formatted_address;
    meetupData.website = req.body.website;
    meetupData.url = req.body.url;
    meetupData.email = req.body.email;
    meetupData.number = req.body.number;


    Meetup.forge(meetupData)
    .save()
    .then(function (model) {
      if (!model) {
        req.flash('errors', {'msg': 'Database error. Meetup not created.'});
      }
      else {
      	req.flash('success', { msg: 'Meetup successfully created!' });
      }

      res.redirect('/meetups/new');
    })
    .otherwise(function (error) {
      req.flash('errors', {'msg': 'Database error. Meetup not created.'});
      res.redirect('/meetups/new');
    });
  }
};
