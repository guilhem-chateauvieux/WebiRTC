'use strict';

/**
 * @ngdoc overview
 * @name webRtcApp
 * @description
 * # webRtcApp
 *
 * Main module of the application.
 */
angular
  .module('webRtcApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/webrtc', {
        templateUrl: 'views/webrtc.html',
        controller: 'WebRTCCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
