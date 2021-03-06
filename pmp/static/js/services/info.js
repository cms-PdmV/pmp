/**
 * @name details.service
 * @type service
 * @description 
 * Provides page details including title, template and typeahead call
 * and error / warning messages
 * @returns {Object} Page details object.
 */
angular.module('pmpApp').factory('PageDetailsProvider', function () {
    'use strict';
    return {
        index: {
            id: 0
        },
        present: {
            id: 1,
            title: 'Present Statistics',
            template: 'static/build/present.min.html',
            typeahead: 'present'
        },
        historical: {
            id: 2,
            title: 'Historical Statistics',
            template: 'static/build/historical.min.html',
            typeahead: 'historical'
        },
        performance: {
            id: 3,
            title: 'Performance Statistics',
            template: 'static/build/performance.min.html',
            typeahead: 'performance'
        },
        messages: {
            W0: {
                type: 'warning',
                message: 'Your request parameters are empty'
            },
            W1: {
                type: 'warning',
                message: 'Your request is already loaded'
            },
            W2: {
                type: 'warning',
                message: 'No results for this request parameters'
            },
            W3: {
                type: 'warning',
                message: 'All data is filtered out'
            },
            S0: {
                type: 'success',
                message: 'Succesfully loaded requests'
            },
            S1: {
                type: 'success',
                message: 'Succesfully appended requests'
            },

            E1: {
                type: 'error',
                message: 'Error occured while getting requests'
            }
        }
    };
});