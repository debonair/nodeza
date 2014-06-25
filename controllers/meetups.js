
var Meetup = require('../models/meetup');
var Meetups = require('../collections/meetups');



module.exports = {

  /*
   * GET /meetups/new
   * load new meetup page
   */
  newMeetup: function (req, res) {
    res.render('meetups_new', {
      title: 'New Meetup',
      description: 'Create a meetup group',
      page: 'newmeetup'
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
   * GET /meetups/:slug
   * loads an meetup by slug
   */
  getMeetup: function (req, res) {
    var slug = req.params.slug;

    Meetup.forge({slug: slug})
    .fetch()
    .then(function (meetup) {
      if(!meetup) return res.redirect('/meetups');

      res.render('meetups_meetup', {
        title: 'Meetup',
        description: meetup.get('short_desc'),
        page: 'meetup', 
        meetup: meetup.toJSON()
      });

      // count number of views
      meetup.viewed();
    })
    .otherwise(function () {
      res.redirect('/meetups');
    });
  },



  /*
   * GET /meetups/edit/:id
   */
  getMeetupEdit: function (req, res) {
    var id = req.params.id;
    var user_id = req.user.get('id');

    Meetup.forge({id: id, user_id: user_id})
    .fetch()
    .then(function (model) {

      res.render('meetups_edit', {
        page: 'meetupedit',
        title: 'Meetup edit',
        description: 'Meetup edit',
        meetup: model.toJSON()
      });
    })
    .otherwise(function () {
      req.flash('errors', {'msg': 'You do not have permission to edit that meetup'});
      res.redirect('back');      
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
      res.render('meetups_meetups', {
        title: 'Find Meetups',
        pagination: collection.paginated,
        meetups: collection.toJSON(),
        query: {},
        description: 'Find a meetup group in South Africa',
        page: 'meetups'
      });
    })
    .otherwise(function () {
      req.flash('errors', {'msg': 'Database error. Could not fetch meetups.'});
      res.redirect('/');      
    });
  },



  /**
   * GET /meetups
   * get upcoming meetups
   */
  getMeetupsAdmin: function (req, res, next) {
    var meetups = new Meetups();


    meetups.base = '/admin/events';
    meetups.whereQuery = ['user_id', '=', req.user.get('id')];
  
    meetups.fetchItems()
    .then(function (collection) {
      res.render('meetups_admin', {
        title: 'Find Meetups',
        pagination: collection.paginated,
        meetups: collection.toJSON(),
        query: {},
        description: 'Find a meetup group in South Africa',
        page: 'adminmeetups'
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
  postMeetup: function (req, res) {
    req.assert('title', 'Name must be at least 4 characters long').len(4);
    req.assert('short_desc', 'Short description must be at lest 12 characters').len(12);
    req.assert('desc', 'Details must be at least 12 characters long').len(12);
    req.assert('email', 'Starting cannot be blank').isEmail();
    req.assert('administrative_area_level_1', 'Please make sure location is showing in map').notEmpty();
  
    var errors = req.validationErrors();
    var meetupData = {};
    var user = req.user;
    var errMsg = 'Database error. Meetup not created.';
    var successMsg = 'Meetup successfully created!';
  
    if (errors) {
      req.flash('errors', errors);
      return res.redirect('/admin/meetups');
    }

    if (req.body.id) {
      errMsg = 'Database error. Meetup not updated.';
      successMsg = 'Meetup successfully updated!';
      meetupData.id = req.body.id;
    }

    meetupData.user_id = user.get('id');
    meetupData.name = req.body.title;
    meetupData.short_desc = req.body.short_desc;
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
    meetupData.meetings = req.body.meetings;


    Meetup.forge(meetupData)
    .save()
    .then(function (model) {
      if (!model) {
        req.flash('errors', {'msg': errMsg});
      }
      else {
      	req.flash('success', { msg: successMsg});
      }

      res.redirect('/admin/meetups');
    })
    .otherwise(function (error) {
      req.flash('errors', {'msg': errMsg});
      res.redirect('/admin/meetups');
    });
  }
};

