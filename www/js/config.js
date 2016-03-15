angular.module('ionicDessiApp.config', [])
    .constant('APP_NAME','My App')
    .constant('APP_VERSION','0.1')
    /*Para browser*/
  /*.constant('API_BASE', 'http://localhost:3000/')*/
    //.constant('API_BASE', 'http://192.168.0.15:3000/')
  .constant('API_BASE', 'http://192.168.0.105:3000/');



    /*Para android emulator
    .constant('API_BASE', 'http://10.0.2.2:3000/')*/
    /*Para genymotion
    .constant('API_BASE', 'http://192.168.56.1:3000/')*/

