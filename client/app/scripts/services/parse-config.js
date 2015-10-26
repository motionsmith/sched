'use strict';

angular.module('schedApp')
  .service('parse', function ($http, parseAppId, parseRestKey, $cookies) {
    function getSessionToken() {
      var userCookie = $cookies.getObject('user');
      if (userCookie) {
        return userCookie.sessionToken;
      }
      return null;
    }

    var parse = {
      keyHeaders: {
        'X-Parse-Application-Id': parseAppId,
          'X-Parse-REST-API-Key': parseRestKey
      },

      getUserHeaders: function () {
        var sessionToken = getSessionToken();
        if (sessionToken) {
          return angular.merge({}, parse.keyHeaders, {'X-Parse-Session-Token': sessionToken});
        }
        return null;
      },

      apiUrl: 'https://api.parse.com/1/',
      user: null,

      initialize: function() {
        var userCookie = $cookies.getObject('user');
        if (userCookie) {
          this.user = userCookie;
          console.log('Have session token for ' + this.user.username + '. Checking if it\'s still valid.');
          return getMe();
        } else {
          console.log('Not loggd in. Logging in automatically.');
          return login('motionsmith', 'test');
        }
      },

      logOut: function () {
        $cookies.remove('user');
        parse.user = null;
      },
      
      // Creates a REST friendly "pointer" object that parse uses to
      // refer to pointer type columns.
      pointerFor: function() {
        var className, objId;
        if (arguments[0] === parse.user) {
        	//Handling current user uniquely, since the className doesn't come through with it.
        	className = '_User';
        	objId = parse.user.objectId;
        } else if (arguments.length === 1) {
        //The argument is a parse object. Pointer can be derived from it.
        className = arguments[0].className;
        objId = arguments[0].id;
        } else {
          // Arguments are the class name and object id.
          className = arguments[0];
          objId = arguments[1];
        }

        return {
          '__type': 'Pointer',
          'className': className,
          'objectId': objId
        };
      }
    };

    function login(username, password) {
      return $http({
        method: 'GET',
        url: parse.apiUrl + 'login',
        params: {
          username: username,
          password: password
        },
        headers: parse.keyHeaders
      }).then(function(response) {
        console.log('User login request succeeded.');
        updateUser(response.data);
      }, function (response) {
        console.log('Problem logging in...' + response);
      });
    }

    function getMe() {
      return $http({
        method: 'GET',
        url: parse.apiUrl + 'users/me',
        headers: parse.getUserHeaders()
      }).then(function (response) {
        updateUser(response.data);
      });
    }

    function updateUser(userObject) {
      $cookies.putObject('user', userObject);
      parse.user = userObject;
    }

    return parse;
  });