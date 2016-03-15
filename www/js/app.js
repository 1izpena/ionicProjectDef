// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('ionicDessiApp', ['ionic', 'ionicDessiApp.controllers', 'ionicDessiApp.config', 'ngAnimate', 'angularMoment', 'ngSanitize', 'textAngular', 'ngTagsInput', 'ngFileUpload', 'angular-md5', 'ngCordova'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    console.log("entra 1");

    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('home', {
    url: '/',
    templateUrl: 'templates/home.html',
    controller: 'AppCtrl',
    params: {
      message: null
    }
  })
    .state('chat', {
      url: '/chat',
      templateUrl: 'templates/chat.html',
      abstract: true,
      cache: false,
      controller: 'ChatCtrl'
    })
    .state('chat.channel', {
      url: '/channel',
      views: {
        'menuContent': {
          templateUrl: 'templates/channel.html'
        }
      }
    })
    .state('forum', {
      url: '/forum',
      templateUrl: 'templates/forum.html',
      controller: 'ForumCtrl',
      cache: false,
      abstract: true
    })
    .state('forum.latest', {
      url: "/latest",
      cache: false,
      views: {
        'latest-tab': {
          templateUrl: "templates/latest.html"
        }
      }
    })
    .state('forum.mostViewed', {
      url: "/mostviewed",
      cache: false,
      views: {
        'mostViewed-tab': {
          templateUrl: "templates/mostViewed.html"
        }
      }
    })
    .state('forum.mostVoted', {
      url: "/mostvoted",
      cache: false,
      views: {
        'mostVoted-tab': {
          templateUrl: "templates/mostVoted.html"
        }
      }
    })
    .state('questionDetail', {
      url: "/forum/question/detail",
      templateUrl: 'templates/questionDetail.html',
      controller: 'DetailCtrl',
      cache: false,
      params: {
        id: null
      }
    });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/');
})
  .config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('responseHandler');
  }]);
