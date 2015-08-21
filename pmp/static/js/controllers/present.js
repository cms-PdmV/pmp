angular.module('pmpApp').controller('PresentController', ['$http', '$location', '$interval', '$scope', 'PageDetailsProvider', 'Data', function($http, $location, $interval, $scope, PageDetailsProvider, Data) {

    // currently displayed data (after filtering)
    $scope.allRequestData = [];

    // all gathered data (before filtering)
    $scope.cachedRequestData = [];

    $scope.inputTags = [];

    /*
     * Core method: onStart load default $scope values and data from URL
     */
    $scope.init = function() {
        $scope.page = PageDetailsProvider.present;

        $scope.graphParam = ['selections', 'grouping', 'stacking', 'coloring'];
        $scope.graphTabs = ['member_of_campaign', 'total_events', 'status', 'prepid', 'priority', 'pwg'];

        $scope.piecharts = {};
        $scope.piecharts.compactTerms = ["done", "to do"];
        $scope.piecharts.domain = ["new", "validation", "done", "approved", "submitted", "nothing", "defined", "to do"];
        $scope.piecharts.fullTerms = ["new", "validation", "defined", "approved", "submitted", "done", "upcoming"];
        $scope.piecharts.nestBy = ["member_of_campaign", "status"];
        $scope.piecharts.sum = "total_events";

        $scope.aOptionsValues = [1, 0, 3, 0, 0, 0];
        $scope.aRadioValues = [0, 0];

        if ($location.search().p != undefined) {
            var toLoad = $location.search().p.split(',');
            $scope.aOptionsValues = toLoad.slice(0, 6);
            $scope.aRadioValues = toLoad.slice(6, 8);
        }

        $scope.requests = {};
        $scope.requests.settings = {duration: 1000, legend: true, sort: true};
        $scope.requests.selections = [];
        var initGrouping = [];
        var initStacking = [];
        var initColoring = '';
        var initValue = '';
        for (var i = 0; i < $scope.aOptionsValues.length; i++) {
            if ($scope.aOptionsValues[i] == 0) {
                $scope.requests.selections.push($scope.graphTabs[i]);
            } else if ($scope.aOptionsValues[i] == 1) {
                initGrouping.push($scope.graphTabs[i]);
            } else if ($scope.aOptionsValues[i] == 2) {
                initStacking.push($scope.graphTabs[i]);
            } else if ($scope.aOptionsValues[i] == 3) {
                initColoring = $scope.graphTabs[i];
            }
        }
        $scope.requests.options = {
            grouping: initGrouping,
            stacking: initStacking,
            coloring: initColoring
        };
        $scope.requests.radio = {}
        $scope.requests.radio.scale = ["linear", "log"];
        $scope.requests.radio.mode = ['events', 'requests', 'seconds'];
        if ($scope.aRadioValues[1] == 1) {
            $scope.requests.radio.scale = ["log", "linear"];
        }
        if ($scope.aRadioValues[0] == 1) {
            $scope.requests.radio.mode = ['requests', 'events', 'seconds'];
        }
        if ($scope.aRadioValues[0] == 2) {
            $scope.requests.radio.mode = ['seconds', 'events', 'requests'];
        }

        $scope.showDate = $location.search().t === 'true';
        $scope.growingMode = ($location.search().m === 'true');
        $scope.displayChains = ($location.search().c === 'true');
        $scope.modeUpdate(true);

        if ($location.search().x !== undefined && $location.search().x != '') Data.setPriorityFilter($location.search().x.split(','));
        if ($location.search().s !== undefined && $location.search().s != '') Data.initializeFilter($location.search().s.split(','), true); 
        if ($location.search().w !== undefined && $location.search().w != '') Data.initializeFilter($location.search().w.split(','), false); 

        //initiate allRequestData from URL
        if ($location.search().r != undefined) {
            $scope.loadingData = true;
            var tmp = $location.search().r.split(',');
            var empty = [$scope.isEmpty(Data.getPWGFilter()), $scope.isEmpty(Data.getStatusFilter())];
            for (var i = 0; i < tmp.length; i++) {
                $scope.load(tmp[i], true, tmp.length, empty[0], empty[1]);
            }
        } else {
            $scope.$broadcast('updateURL');
        }
    }

    $scope.parseLoadedRequestsForTags = function(doReset, newRequests, campaign) {
        if (doReset) $scope.inputTags = [];
        if ($scope.displayChains) {
            $scope.inputTags.push(campaign);
            return true;
        }
        var newTags = [];
        var tmpMOC, broken = false;
        for (var i = 0; i < newRequests.length; i++) {
            tmpMOC = newRequests[i].member_of_campaign;
            if ($scope.inputTags.indexOf(tmpMOC) === -1) {
                if (newTags.indexOf(tmpMOC) === -1) {
                    newTags.push(newRequests[i].member_of_campaign);
                }
            } else {
                broken++;
                break;
            }
        }
        if (broken) {
            return false;
        } else {
            $scope.inputTags.push.apply($scope.inputTags, newTags);
            return true;
        }
    }

    $scope.load = function(campaign, add, more, defaultPWG, defaultStatus) {
        if (!campaign) {
            $scope.showPopUp('warning', 'Your request parameters are empty');
        } else if (add & $scope.inputTags.indexOf(campaign) !== -1) {
            $scope.showPopUp('warning', 'Your request is already loaded');
        } else {
            $scope.loadingData = true;
            if ($scope.growingMode) {
                var promise = $http.get("api/" + campaign + "/growing/" + $scope.displayChains);
            } else {
                var promise = $http.get("api/" + campaign + "/announced/" + $scope.displayChains);
            }
            promise.then(function(data) {
                if (!data.data.results.length) {
                    // if API response is empty 
                    $scope.showPopUp('error', 'No results for this request parameters');
                    $scope.setURL();
                    $scope.loadingData = false;
                } else {
                    $scope.allRequestData = [];
                    if (add) {
                        // apply appending campaign
                        if ($scope.parseLoadedRequestsForTags(false, data.data.results, campaign)) {
                            data.data.results.push.apply(data.data.results, $scope.cachedRequestData);
                            Data.changeFilter(data.data.results, false, defaultStatus, true);
                            Data.changeFilter(data.data.results, false, defaultPWG, false);
                            $scope.showPopUp('success', 'Succesfully appended requests');
                        } else {
                            data.data.results = $scope.cachedRequestData;
                            $scope.showPopUp('error', 'Unable to process, some requests to be duplicated');
                        }
                    } else {
                        // apply loading all or single campaign
                        $scope.updateOnRemoval([], {}, {});
                        Data.changeFilter(data.data.results, true, true, true);
                        Data.changeFilter(data.data.results, true, true, false);
                        $scope.parseLoadedRequestsForTags(true, data.data.results, campaign);
                        $scope.showPopUp('success', 'Succesfully loaded requests');
                    }
                    $scope.cachedRequestData = data.data.results;
                    $scope.setURL();
                }
                if (!more || more == $scope.inputTags.length) {
                    $scope.updateRequestData();
                    $scope.$broadcast('updateFilterTag');
                    $scope.loadingData == false;
                }
            }, function() {
                $scope.showPopUp('error', 'Error getting requests');
                $scope.loadingData = false;
            });
        }
    };

    $scope.modeUpdate = function(onlyTitle) {
        if ($scope.growingMode) {
            $scope.mode = ': Growing Mode';
        } else {
            $scope.mode = ': Announced Mode';
        }
        $scope.cachedRequestData = [];
        $scope.allRequestData = [];
        
        if (onlyTitle) {
            return null;
        }
        var tmp = angular.copy($scope.inputTags);
        $scope.inputTags = [];

        if (tmp.length < 2 || !$scope.displayChains) {
            for (var i = 0; i < tmp.length; i++) {
                $scope.load(tmp[i], true, tmp.length);
            }
        } else {
            $scope.updateOnRemoval([], {}, {});
        }
    };

    $scope.setURL = function(name, value) {
        $location.path($location.path(), false);
        if (typeof name != undefined && typeof value != undefined) {
            $scope.aOptionsValues[$scope.graphTabs.indexOf(value)] = $scope.graphParam.indexOf(name);
        }
        var params = {}
        if ($scope.inputTags.length) {
            params.r = $scope.inputTags.join(',')
        }
        params.p = $scope.aOptionsValues.join(',') + ',' + $scope.aRadioValues.join(',');
        params.t = $scope.showDate + "";
        params.m = $scope.growingMode + "";
        params.c = $scope.displayChains + "";
        params.x = Data.getPriorityFilter().join(',');

        if (!$scope.isEmpty(Data.getPWGFilter())) {
            var w = [];
            for (var i in Data.getPWGFilter()) {
                if (Data.getPWGFilter()[i]) w.push(i);
            }
            params.w = w.join(',');
        }
        if (!$scope.isEmpty(Data.getStatusFilter())) {
            var s = [];
            for (var i in Data.getStatusFilter()) {
                if (Data.getStatusFilter()[i]) s.push(i);
            }
            params.s = s.join(',');
        }

        $location.search(params);
        $scope.$broadcast('updateURL');
    }
    
    $scope.setScaleAndOperation = function(i, value) {
        if ($scope.aRadioValues[i] != value) {
            $scope.aRadioValues[i] = value;
            $scope.setURL();
        }
    }

    $scope.tagRemove = function(tagToRemove) {
        $scope.loadingData = true;
        setTimeout(function() {
            var tmp = $scope.cachedRequestData;
            var data1 = [];
            var newPWGObjectTmp = {};
            var newStatusObjectTmp = {}
            if (tagToRemove !== '*') {
                for (var i = 0; i < tmp.length; i++) {
                    if (tmp[i].member_of_campaign !== tagToRemove) {
                        data1.push(tmp[i]);

                        if (newStatusObjectTmp[tmp[i].status] === undefined) {
                            newStatusObjectTmp[tmp[i].status] = Data.getStatusFilter()[tmp[i].status]
                        }

                        if (newPWGObjectTmp[tmp[i].pwg] === undefined) {
                            newPWGObjectTmp[tmp[i].pwg] = Data.getPWGFilter()[tmp[i].pwg]
                        }
                    }
                }
                $scope.inputTags.splice($scope.inputTags.indexOf(tagToRemove), 1);
            }
            $scope.updateOnRemoval(data1, newPWGObjectTmp, newStatusObjectTmp);
        }, 1000);
    }

    $scope.updateOnRemoval = function(requestData, newPWGObject, newStatusObject) {
        $scope.cachedRequestData = requestData;
        Data.setStatusFilter(newStatusObject);
        Data.setPWGFilter(newPWGObject);
        $scope.setURL();
        $scope.updateRequestData();
        $scope.$broadcast('updateFilterTag');
    }

    $scope.takeScreenshot = function(format) {
        $scope.loading = true;
        if (format === undefined) format = 'svg';
        var xml = (new XMLSerializer).serializeToString(document.getElementById("ctn").getElementsByTagName("svg")[0]).replace(/#/g,'U+0023').replace(/\n/g, ' ').replace(/\//g, '\\\\');
        $http.get('ts/'+ format +'/' + encodeURIComponent(xml)).then(function(data) {
            window.open(data.data);
            $scope.loading = false;
        });
    }

    $scope.updateRequestData = function() {
        $scope.loadingData = true;

        var max = Data.getPriorityFilter()[1];
        var min = Data.getPriorityFilter()[0];
        if (isNaN(max) || max == '') {
            max = Number.MAX_VALUE;
        }

        setTimeout(function() {
            var tmp = $scope.cachedRequestData;
            var data = [];
            for (var i = 0; i < tmp.length; i++) {
                if (tmp[i].priority >= min &&
                    tmp[i].priority <= max &&
                    Data.getStatusFilter()[tmp[i].status] && Data.getPWGFilter()[tmp[i].pwg]) {
                    data.push(tmp[i]);
                }
            }
            $scope.$apply(function() {
                $scope.allRequestData = data;
                $scope.loadingData = false;
            });
        }, 0);
    }

    $interval($scope.updateCurrentDate, 1000);
    $interval(function(){$scope.updateLastUpdate('campaigns,chained_campaigns,requests,chained_requests')}, 2*60*1000);
    $scope.updateLastUpdate('campaigns,chained_campaigns,requests,chained_requests');
}]);