'use strict';

/**
 * @ngdoc service
 * @name schedApp.myAppointmentsHelper
 * @description
 * # myAppointmentsHelper
 * Service in the schedApp.
 */
angular.module('schedApp')
  .service('availabilityHelper', function ($window) {
    var moment = $window.moment;
    var data = [];

    return {
      initialize: function (availabilities) {
        data = [];
        for (var key in availabilities) {
          for (var i = 0; i < availabilities[key].length; i++) {
            data.push(moment(key, 'YYYY-MM-DD').hours(availabilities[key][i]));
          }
        }
      },
      //Sort by date ascending
      filterSoonest: function (limit) {
        var results = [];
        for (var i = 0; i < Math.min(data.length, limit); i++) {
          results.push(data[i]);
        }
        return results;
      },
      //Sort by hours first ascending, then by dates second ascending
      filterMornings: function (limit) {
        
      },
      //Sort by hours first descending, then by dates second ascending.
      filterAfternoons: function (limit) {
        
      },
      //Take the soonest ones that are more than a week away.
      filterLater: function (limit) {
        
      }
    };
  });
