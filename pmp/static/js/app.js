'use strict';

var pmpApp = angular.module('pmpApp', ['ngRoute', 'mcm.charts'])
    .config(['$routeProvider', '$locationProvider',
        function($routeProvider, $locationProvider) {
            $routeProvider
                .when('/campaign', {
                    templateUrl: 'partials/campaign.html',
                    controller: 'CampaignsController'
                })
                .when('/chain', {
                    templateUrl: 'partials/chain.html',
                    controller: 'ChainsController'
                });
            $locationProvider.html5Mode(true);
        }
    ]);