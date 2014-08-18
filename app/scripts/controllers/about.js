'use strict';

/**
 * @ngdoc function
 * @name webRtcApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the webRtcApp
 */
angular.module('webRtcApp')
  .controller('AboutCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
