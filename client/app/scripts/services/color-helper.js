'use strict';

angular.module('schedApp')
  .service('colorHelper', function () {
    return {
      
      //Sets the gradient color of a card
      setGradient: function (jElement, color) {
        jElement.css('background-image', 'linear-gradient(#ffffff 0%, #ffffff 70%, ' + color + ' 100%)');          
      },

      //Returns the color between lower and upper, according to pct.
      colorScale: function (pct, lower, upper) {
        //Returns the value between lower and upper, according to pct.
        function lerp (pct, lower, upper) {
          var range = upper - lower;
          var color = range * pct + lower;

          return Math.round(color);
        }

        var r = lerp(pct, lower[0], upper[0]);
        var g = lerp(pct, lower[1], upper[1]);
        var b = lerp(pct, lower[2], upper[2]);

        return 'rgb(' + r + ',' + g + ',' + b + ')';
      }
      
    };
  });
