/**
 * @name performance.controller
 * @type controller
 * @description Performance Graph Controller
 */
angular.module('pmpApp').controller('PerformanceController', ['$http',
    '$interval', '$location', '$scope', 'PageDetailsProvider', 'Data',
    function ($http, $interval, $location, $scope, PageDetailsProvider,
        Data) {
        'use strict';

        /**
         * @description Core: Init method for the page. Init scope variables from url.
         */
        $scope.init = function () {
            $scope.page = PageDetailsProvider.performance;
            Data.reset(true);
            $scope.difference = {
                minuend: 'done',
                subtrahend: 'created'
            };
            $scope.selections = ['validation', 'approved',
                'submitted'
            ];
            var inx;
            if ($location.search().min !== undefined) {
                inx = $scope.selections.indexOf($location.search().min);
                if (inx != -1) {
                    $scope.difference.minuend = $location.search().min;
                    $scope.selections.splice(inx, 1);
                }
            }

            if ($location.search().sub !== undefined) {
                inx = $scope.selections.indexOf($location.search().sub);
                if (inx != -1) {
                    $scope.difference.subtrahend = $location.search()
                        .sub;
                    $scope.selections.splice(inx, 1);
                }
            }

            $scope.showDate = ($location.search().t === 'true');
            $scope.linearScale = ($location.search().l === 'true');
            if ($location.search.b !== '' && !isNaN($location.search()
                    .b)) {
                $scope.bins = parseInt($location.search().b, 10);
            } else {
                $scope.bins = 10;
            }
            if ($location.search().x !== undefined && $location.search()
                .x !== '') Data.setPriorityFilter($location.search()
                .x.split(','));
            if ($location.search().s !== undefined && $location.search()
                .s !== '') Data.initializeFilter($location.search()
                .s.split(','), true);
            if ($location.search().w !== undefined && $location.search()
                .w !== '') Data.initializeFilter($location.search()
                .w.split(','), false);
            if ($location.search().r !== undefined) {
                $scope.loadingData = true;
                var tmp = $location.search().r.split(',');
                var arg = false;
                if (Object.keys(Data.getPWGFilter()).length) {
                    arg = tmp.length;
                }
                for (var i = 0; i < tmp.length; i++) {
                    $scope.load(tmp[i], true, arg);
                }
            } else {
                $scope.url = $location.absUrl();
            }
        };

        /**
         * @description Core: Query API
         * @param {String} request User input.
         * @param {Boolean} add Append results if true
         * @param {Boolean} more Are there more requests in a queue
         * @param {Boolean} defaultPWG When new PWG shows up what should be default filter value
         * @param {Boolean} defaultStatus When new status shows up what should be default filter value
         */
        $scope.load = function (input, add, more, defaultPWG,
            defaultStatus) {
            if (!input) {
                $scope.showPopUp(PageDetailsProvider.messages.W0.type,
                    PageDetailsProvider.messages.W0.message);
            } else if (add && Data.getInputTags().indexOf(input) !==
                -1) {
                $scope.showPopUp(PageDetailsProvider.messages.W1.type,
                    PageDetailsProvider.messages.W1.message);
            } else {
                $scope.loadingData = true;
                var promise = $http.get("api/" + input +
                    "/performance/_");
                promise.then(function (data) {
                    if (!data.data.results.length) {
                        $scope.showPopUp(
                            PageDetailsProvider.messages
                            .W2.type,
                            PageDetailsProvider.messages
                            .W2.message);
                        $scope.loadingData = false;
                    } else {
                        if (add) {
                            Data.changeFilter(data.data.results,
                                false, defaultStatus,
                                true);
                            Data.changeFilter(data.data.results,
                                false, defaultPWG,
                                false);
                            Data.setLoadedData(data.data.results,
                                true);
                            $scope.showPopUp(
                                PageDetailsProvider.messages
                                .S1.type,
                                PageDetailsProvider.messages
                                .S1.message);
                        } else {
                            Data.reset(false);
                            Data.changeFilter(data.data.results,
                                true, true, true);
                            Data.changeFilter(data.data.results,
                                true, true, false);
                            Data.setLoadedData(data.data.results,
                                false);
                            $scope.showPopUp(
                                PageDetailsProvider.messages
                                .S0.type,
                                PageDetailsProvider.messages
                                .S0.message);
                        }
                        Data.setInputTags(input, true,
                            false);
                        $scope.setURL();
                    }
                }, function () {
                    $scope.showPopUp(PageDetailsProvider.messages
                        .E0.type, PageDetailsProvider.messages
                        .E1.message);
                    $scope.loadingData = false;
                });
            }
        };

        /**
         * @description Core: Change URL when data or filter changes
         */
        $scope.setURL = function () {
            $location.path($location.path(), false);
            var params = {};

            // number of bins
            if ($scope.bins !== undefined || $scope.bins !== '') {
                params.b = $scope.bins;
            }
            // list of requests separated by comma
            var r = Data.getInputTags();
            if (r.length) params.r = r.join(',');
            // if show the time block
            if ($scope.showDate !== undefined) {
                params.t = $scope.showDate + '';
            }
            // set filter priority
            params.x = Data.getPriorityFilter().join(',');
            // set filter pwgs
            if (!$scope.isEmpty(Data.getPWGFilter())) {
                var w = [];
                for (var i in Data.getPWGFilter()) {
                    if (Data.getPWGFilter()[i]) w.push(i);
                }
                params.w = w.join(',');
            }

            // set filter status
            if (!$scope.isEmpty(Data.getStatusFilter())) {
                var s = [];
                for (var j in Data.getStatusFilter()) {
                    if (Data.getStatusFilter()[j]) s.push(j);
                }
                params.s = s.join(',');
            }

            // setting minuend
            if ($scope.difference.minuend !== '') {
                params.min = $scope.difference.minuend;
            }
            // setting subtrahend
            if ($scope.difference.subtrahend !== '') {
                params.sub = $scope.difference.subtrahend;
            }
            // set scale
            if ($scope.linearScale !== undefined) {
                params.l = $scope.linearScale + '';
            }

            $location.search(params);
            $scope.$broadcast('updateURL');
        };

        /**
         * @description Core: Query server for a report of current view
         * @param {String} format which will be requested (pdf/png/svg)
         */
        $scope.takeScreenshot = function () {
            var tmp = document.getElementById("ctn");
            var svg = tmp.getElementsByTagName("svg")[0];
            var svg_xml = (new XMLSerializer()).serializeToString(
                svg);
            var blob = new Blob([svg_xml], {
                type: "text/plain;charset=utf-8"
            });
            saveAs(blob, "screenshot.html");
        };

        /**
         * @description Change histogram
         */
        $scope.applyHistogram = function (d, e) {
            $scope.histogramData = d;
            $scope.histogramDataExtended = e;
        };

        /**
         * @description When differences are recalculated in derective
         */
        $scope.applyDifference = function (d) {
            $scope.difference = d;
            $scope.setURL();
        };

        /**
         * @description On scale change 
         */
        $scope.changeScale = function (a) {
            $scope.linearScale = a;
            $scope.setURL();
        };

        // Broadcast receiver, change filtered data on loaded data change
        $scope.$on('onChangeNotification:FilteredData', function () {
            $scope.loadingData = false;
            $scope.setURL();
            $scope.data = Data.getFilteredData();
        });

        // Set interval update of time variables
        $interval($scope.updateCurrentDate, 1000);
        $interval(function () {
            $scope.updateLastUpdate('requests');
        }, 2 * 60 * 1000);
        $scope.updateLastUpdate('requests');
    }
]);