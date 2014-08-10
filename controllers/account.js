
var User = require('../models/user');
var Users = require('../collections/users');
var Roles = require('../collections/roles');
var Tokens = require('../models/token');
var Mailer = require('../lib/mailer');
var async = require('async');
var crypto = require('crypto');
var passport = require('passport');
var _ = require('lodash');


/**
 * Converts date in milliseconds to MySQL datetime format
 * @param: ts - date in milliseconds
 * @returns: MySQL datetime
 */
function datetime(ts) {
  return new Date(ts).toISOString().slice(0, 19).replace('T', ' ');
}


module.exports = {

  /**
   * GET /login
   * View login page
   */
  getLogin: function (req, res) {
    res.render('account/login', {
      title: 'Log In',
      description: 'NodeZA log in page',
      page: 'login'
    });
  },


  /*
   * GET /users/:id
   * loads an event by id
   */
  getUser: function (req, res, next) {
    User.forge({slug: req.params.slug})
    .fetch({withRelated: ['posts', 'events']})
    .then(function (profile) {
      res.render('account/profile', {
        title: 'NodeZA profile of ' + profile.get('name'),
        myposts: profile.related('posts').toJSON(),
        gravatar: profile.gravatar(198),
        myevents: profile.related('events').toJSON(),
        description: 'NodeZA profile of ' + profile.get('name'),
        profile: profile.getJSON(['slug', 'name', 'location', 'about', 'email']),
        page: 'profile'
      });

      profile.viewed();
    })
    .otherwise(function () {
      req.flash('errors', {'msg': 'Could not find user.'});
      res.redirect('back');
    });
  },


  /*
   * GET /users/new
   * Load new user form
  **/
  getNewUser: function (req, res, next) {
    res.render('account/new_user', {
      title: 'New User',
      description: 'New User',
      page: 'newuser'
    });
  },


  /*
   * GET /users/edit/:id
   * Load user edit form
  **/
  getEditUser: function (req, res, next) {
    var roles = new Roles();

    roles.fetch()
    .then(function (roles) {
      User.forge({id: req.params.id})
      .fetch({withRelated: ['role']})
      .then(function (user) {
        res.render('account/edit_user', {
          title: 'Edit User',
          description: 'Edit User',
          usr: user.toJSON(),
          roles: roles.toJSON(),
          page: 'edituser'
        });
      })
      .otherwise(function () {
        req.flash('errors', {'msg': 'Could not find user.'});
        res.redirect('/account/users');
      });
    })
    .otherwise(function () {
      req.flash('errors', {'msg': 'Could not find user roles.'});
      res.redirect('/account/users');
    });
  },


  /*
   * GET /account/users/roles
   * Load user roles
  **/
  getRoles: function (req, res, next) {
    var roles = new Roles();

    roles.fetch()
    .then(function (roles) {
      res.render('account/roles', {
        title: 'User Roles',
        description: 'User Roles',
        roles: roles.toJSON(),
        page: 'userroles'
      });
    })
    .otherwise(function () {
      req.flash('errors', {'msg': 'Could not find user roles.'});
      res.redirect('/account/users');
    });
  },


  /**
   * POST /login
   * Log in user
   */
  postLogin: function(req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();
  
    var errors = req.validationErrors();
  
    if (errors) {
      req.flash('errors',  { msg: errors});
      return res.redirect('/login');
    }
  
    passport.authenticate('local', function(err, user, info) {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.flash('errors', { msg: info.message });
        return res.redirect('/login');
      }
      
      req.logIn(user, function(err) {
        if (err) {
          return next(err);
        }

        res.redirect(req.session.returnTo || '/');
      });
    })(req, res, next);
  },


  /**
   * GET /logout
   * Logout user
   */
  logout: function(req, res) {
    req.logout();
    res.redirect('/');
  },


  /**
   * GET /signup
   * Get signup form.
   */
  getSignup: function (req, res) {
    res.render('account/signup', {
      title: 'Sign Up',
      description: 'Sign up and become part of the Node.js community in South Africa',
      page: 'signup'
    });
  },


  /**
   * POST /signup
   * Registers user
   */
  postSignup: function(req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 6 characters long').len(6);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
  
    var errors = req.validationErrors();
    var userData = {};
  
    if (errors) {
      req.flash('errors', errors);
      return res.redirect('/signup');
    }

    userData.name = req.body.name;
    userData.email = req.body.email;
    userData.password = req.body.password;
    userData.role_id = 1;

    User.forge(userData)
    .save()
    .then(function (model) {
      req.flash('success', { msg: 'Account successfully created! You are now logged in.' });

      req.logIn(model, function(err) {
        if (err) {
          return next(err);
        }
        
        res.redirect('/');
      });         
    })
    .otherwise(function (error) {
      req.flash('errors', {'msg': 'Database error. Account not created.'});
      res.redirect('/signup');
    });
  },


  /**
   * GET /reset/:token
   * Loads password reset form.
   */
  getReset: function(req, res) {
    var user =  new User();

    user.query(function (qb) {
      qb.where('resetPasswordToken', '=', req.params.token)
      .andWhere('resetPasswordExpires', '>', datetime(Date.now()));
    })
    .fetch()
    .then(function(user) {
      if (!user) {
        req.flash('errors', {msg: 'Password reset token is invalid or has expired.'});
        return res.redirect('/forgot');
      }
      res.render('account/password', {
        title: 'Password Reset',
        token: req.params.token,
        description: 'Reset your password',
        page: 'resetpassword'
      });
    })
    .otherwise(function () {
      req.flash('errors', { msg: 'Database error. Could not process query.' });
      return res.redirect('/forgot');
    });
  },



  /**
   * GET /account/users
   * get all users
   */
  getUsers: function (req, res) {
    var users = new Users();
    var page = parseInt(req.query.p, 10);
    var currentpage = page || 1; 
    var opts = {
      limit: 10,
      page: currentpage,
      order: "asc",
      where: ['created_at', '<', new Date()]
    };

    users.fetchBy('id', opts, {withRelated: ['role']})
    .then(function (collection) {
      res.render('account/users', {
        title: 'Registered Users',
        pagination: users.pages,
        users: collection.toJSON(),
        description: 'Registered Users',
        page: 'users',
        query: {}
      });
    })
    .otherwise(function (error) {
      req.flash('errors', {'msg': 'Database error.'});
      res.redirect('/');      
    });
  },
  

  /**
   * POST /reset/:token
   * Process the reset password request.
   */
  postReset: function (req, res, next) {
    req.assert('password', 'Password must be at least 6 characters long.').len(6);
    req.assert('confirm', 'Passwords must match.').equals(req.body.password);
  
    var errors = req.validationErrors();
  
    if (errors) {
      req.flash('errors', errors);
      return res.redirect('back');
    }
  
    async.waterfall([
      function(done) {
        var user =  new User();

        user.query(function (qb) {
          qb.where('resetPasswordToken', '=', req.params.token)
          .andWhere('resetPasswordExpires', '>', new Date());
        })
        .fetch()
        .then(function(model) {
          if (!model) {
            req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
            return res.redirect('back');
          }

          user.save({
            password: req.body.password,
            resetPasswordToken: null,
            resetPasswordExpires: null
          })
          .then(function (user) {
            if (!user) {
              return next({errors: {msg: 'Failed to save new password.'}});
            }
            req.logIn(user, function (err) {
              done(err, user);
            });
          })
          .otherwise(function () {
            next({errors: {msg: 'Database error. Failed to save new password.'}});
          });
        })              
        .otherwise(function () {
          next({errors: {msg: 'Database error. Failed to execute query.'}});
        });
      },
      function(user, done) {
        var mailOptions = {
          to: user.get('email'),
          from: 'qawemlilo@gmail.com',
          subject: 'Your NodeZA password has been changed',
          body: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.get('email') + ' has just been changed.\n'
        };
        
        Mailer(mailOptions, function (err) {
          req.flash('success', { msg: 'Success! Your password has been changed.' });
          done(err);
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/');
    });
  },
  

  /**
   * GET /forgot
   * Loads forgot password page.
   */
  getForgot: function (req, res) {
    res.render('account/forgot', {
      title: 'Forgot Password',
      description: 'Forgotten password',
      page: 'forgot'
    });
  },

  
  /**
   * POST /forgot
   * Create a random token, then the send user an email with a reset link.
   */
  postForgot: function (req, res, next) {
    req.assert('email', 'Please enter a valid email address.').isEmail();
  
    var errors = req.validationErrors();
  
    if (errors) {
      req.flash('errors', errors);
      return res.redirect('/forgot');
    }
  
    async.waterfall([
      function (done) {
        crypto.randomBytes(16, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.forge({email: req.body.email})
        .fetch()
        .then(function(user) {
          if (!user) {
            req.flash('errors', {msg: 'No account with that email address exists.' });
            return res.redirect('/forgot');
          }
  
          user.save({
            resetPasswordToken: token,
            resetPasswordExpires: datetime(Date.now() + 3600000)
          })
          .then(function(model) {
            done(false, token, model);
          })
          .otherwise(function () {
            done({'errors': {msg: 'Database error'}});
          });
        });
      },
      function(token, user, done) {
        var mailOptions = {
          to: user.get('email'),
          from: 'NodeZA <info@nodeza.co.za>',
          subject: 'Reset your password on NodeZA',
          body: 'Hi there ' + user.get('name') + ', \n\n' +
            'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n\n\n' +
            'NodeZA Team'
        };

        Mailer(mailOptions, function(err, resp) {
          req.flash('info', {msg: 'An e-mail has been sent to ' + user.get('email') + ' with further instructions.' });
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  },


  /**
   * GET /account
   * logged in user account details form.
   */
  getAccount: function (req, res) {
    res.render('account/account', {
      title: 'My Account',
      description: 'My account details',
      page: 'account',
      gravatar: req.user.gravatar()
    });
  },


  /**
   * GET /account/password
   * logged in user password form
   */
  getPasswordForm: function (req, res) {
    res.render('account/password', {
      title: 'Change Password',
      description: 'Change your password',
      page: 'changepassword'
    });
  },


  /**
   * GET /account/password
   * logged in user password form
   */
  getLinkedAccounts: function (req, res) {
    var tokens = req.user.related('tokens').toJSON();
    var github = _.findWhere(tokens, { kind: 'github' });
    var google = _.findWhere(tokens, { kind: 'google' });
    var twitter = _.findWhere(tokens, { kind: 'twitter' });

    res.render('account/linked', {
      title: 'Linked Accounts',
      github: github,
      twitter: twitter,
      google: google,
      description: 'Your linked accounts',
      page: 'linkedaccounts'
    });
  },


  /**
   * POST /account/password
   * change user password.
  */
  postPassword: function(req, res, next) {
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirm', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
      req.flash('errors', errors);
      return res.redirect('/account');
    }

    req.user.save({password: req.body.password})
    .then(function () {
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account/password');
    })
    .otherwise(function (error) {
      console.log(error);
      req.flash('error', { msg: 'Failed to change password.' });
      res.redirect('/account/password');
    });
  },


  /**
   * POST /account
   * Edit user account.
  */
  postAccount: function(req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('name', 'Name must be at least 3 characters long').len(3);

    var details = {
      last_name: req.body.last_name,
      name: req.body.name,
      email: req.body.email,
      gender: req.body.gender,
      location:req.body.location,
      website: req.body.website,
      about: req.body.about,
      updated_by: req.user.get('id')
    };

    User.forge({id: req.body.id})
    .fetch()
    .then(function (user) {
      user.save(details, {method: 'update'})
      .then(function() {
        req.flash('success', {msg: 'Account information updated.'});
        res.redirect('/account');
      })
      .otherwise(function (error) {
        req.flash('error', {msg: 'Account information not updated.'});
        res.redirect('/account');
      });
    })
    .otherwise(function () {
      req.flash('error', {msg: 'Account not found.'});
      res.redirect('/');
    });
  },


  /**
   * POST /account/delete
   * Delete user account.
  */
  postDeleteAccount: function(req, res, next) {
    var user = req.user;
    
    user.deleteAccount(user.get('id'))
    .then(function () {
      req.logout();
      res.redirect('/');
    })
    .otherwise(function (msg) {
      req.flash('error', { msg: msg });
      res.redirect('/account');        
    });
  },


  /**
   * GET /account/unlink/:provider
   * Unlink an auth account
   */
  getOauthUnlink: function(req, res, next) {
    var provider = req.params.provider;
    
    req.user.unlink(provider)
    .then(function (msg) {
      req.flash('info', {msg: msg}); 
      res.redirect('/account/linked');
    })
    .otherwise(function (msg) {
      req.flash('error', {msg: msg}); 
      next({'errors': {msg: msg}});
    });
  }
};
