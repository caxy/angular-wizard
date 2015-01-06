/**
 * Easy to use Wizard library for AngularJS
 * @version v0.4.0 - 2014-04-25 * @link https://github.com/mgonto/angular-wizard
 * @author Martin Gontovnikas <martin@gon.to>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
angular.module('templates-angularwizard', ['step.html', 'wizard.html']);

angular.module("step.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("step.html",
    "<section ng-show=\"selected\" ng-class=\"{current: selected, done: completed}\" class=\"step\" ng-transclude>\n" +
    "</section>");
}]);

angular.module("wizard.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("wizard.html",
    "<div>\n" +
    "    <div class=\"steps\" ng-transclude></div>\n" +
    "    <ul class=\"steps-indicator steps-{{steps.length+1}}\" ng-if=\"!hideIndicators\">\n" +
    "      <li class=\"done\">\n" +
    "        <a class=\"step-info\" ng-click=\"goTo(0)\" href=\"/#/start\">About You</a>\n" +
    "      </li>\n" +
    "      <li class=\"toggle-{{step.toggle}}\" ng-class=\"{disabled: step.disabled, default: !step.completed && !step.selected && !step.reached, current: step.selected && !step.completed, done: step.completed && !step.selected, reached: step.reached && !step.selected, editing: step.selected && step.completed}\" ng-repeat=\"step in steps\">\n" +
    "        <a class=\"step-{{step.id}}\" ng-click=\"goTo(step)\">{{step.title || step.wzTitle}}</a>\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "</div>\n" +
    "");
}]);


angular.module('mgo-angular-wizard', ['templates-angularwizard']);

angular.module('mgo-angular-wizard').directive('wzStep', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            wzTitle: '@',
            id: '@',
            title: '@',
            lastvisited: '@',
            toggleId: '@',
            stepindex: '@'
        },
        require: '^wizard',
        templateUrl: function(element, attributes) {
          return attributes.template || "step.html";
        },
        link: function($scope, $element, $attrs, wizard) {
            $scope.title = $scope.title || $scope.wzTitle;
            wizard.setLastVisited($scope.lastvisited);
            wizard.addStep($scope, $scope.stepindex, $scope.toggleId, false);
        }
    }
});

angular.module('mgo-angular-wizard').directive('wizard', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            currentStep: '=',
            onFinish: '&',
            hideIndicators: '=',
            editMode: '=',
            name: '@'
        },
        templateUrl: function(element, attributes) {
          return attributes.template || "wizard.html";
        },
        controller: ['$scope', '$rootScope', '$element', 'WizardHandler', function($scope, $rootScope, $element, WizardHandler) {

            WizardHandler.addWizard($scope.name || WizardHandler.defaultName, this);


            // EVENT HANDLERS
            $scope.$on('$destroy', function() {
                WizardHandler.removeWizard($scope.name || WizardHandler.defaultName);
            });

            $rootScope.$on('toggleMenuItem', function(e, menuToggleType) {
              var element = angular.element('.toggle-' + menuToggleType.item);

              switch (menuToggleType.toggle) {
                case 'on':
                  $scope.steps[menuToggleType.index].disabled = false;
                  element.removeClass('disabled');
                  break;

                default:
                  $scope.steps[menuToggleType.index].disabled = true;
                  if (!element.hasClass('reached')) {
                    element.addClass('disabled');
                  }
              }
            });


            $scope.steps = [];

            $scope.highestReachedStep = 0;
            $scope.lastVisitedStep = '';
            this.setLastVisited = function(laststep) {
                $scope.lastVisitedStep = laststep;
            };

            $scope.$watch('currentStep', function(step) {
                if (!step) return;
                var stepTitle = $scope.selectedStep.title || $scope.selectedStep.wzTitle;
                if ($scope.selectedStep && stepTitle !== $scope.currentStep) {
                    $scope.goTo(_.findWhere($scope.steps, {title: $scope.currentStep}));
                }

            });

            $scope.$watch('[editMode, steps.length]', function() {
                var editMode = $scope.editMode;
                if (_.isUndefined(editMode) || _.isNull(editMode)) return;

                if (editMode) {
                    _.each($scope.steps, function(step) {
                        step.completed = true;
                    });
                }
            }, true);


            this.addStep = function(step, stepIndex, toggleId, disabled) {
                if (toggleId) {
                  step.toggle = toggleId;
                  step.disabled = disabled;
                }

                if ($scope.lastVisitedStep) {
                    if (stepIndex < $scope.lastVisitedStep) {
                        step.completed = true;
                        step.selected = false;
                    }
                    else if (stepIndex === $scope.lastVisitedStep) {
                        step.selected = true;
                    }
                }

                $scope.steps.push(step);
                if ($scope.steps.length === 1) {
                    $scope.goTo($scope.steps[0]);
                }
            };


            $scope.goTo = function(step) {

              // skip past disabled steps
              if (step.disabled) {
                // add 'done' class to the menu item so the progress bar is wide enough
                $scope.steps[step.stepindex].done = true;

                angular.element('.toggle-' + $scope.steps[step.stepindex].title.toLowerCase()).addClass('reached');
                angular.element('.toggle-' + $scope.steps[step.stepindex].title.toLowerCase()).removeClass('default');

                // skip past disabled steps
                $scope.goTo($scope.steps[parseInt(step.stepindex) + 1]);
              }
              else {
                if (step === 0) {
                  // reset steps
                  $rootScope.$emit('newLastVisitedStep', {stepindex: 0});
                }
                else {
                  unselectAll();
                  $scope.selectedStep = step;

                  if (!_.isUndefined($scope.currentStep)) {
                    $scope.currentStep = step.title || step.wzTitle;
                  }

                  step.selected = true;
                  $scope.lastVisitedStep = step.stepindex;
                  $scope.steps[step.stepindex].reached = true;

                  if (step.stepindex > $scope.highestReachedStep) {
                    $scope.highestReachedStep = step.stepindex;
                  }

                  // update lastVisitedStep back at the service with new index
                  $rootScope.$emit('newLastVisitedStep', {stepindex: step.stepindex});
                }
              }

            };


            function unselectAll() {
                _.each($scope.steps, function (step) {
                    step.selected = false;
                });
                $scope.selectedStep = null;
            }


            // on continue btn click
            this.next = function(draft) {
                var index = _.indexOf($scope.steps , $scope.selectedStep);
                if (!draft) {
                    $scope.selectedStep.completed = true;
                }
                if (index === $scope.steps.length - 1) {
                    this.finish();
                } else {
                    $scope.goTo($scope.steps[index + 1]);
                }
            };


            // coming straight here, if there was a stored 'last vistied' value
            this.goTo = function(stepVar) {
                var stepTo;
                if (_.isNumber(parseInt(stepVar))) {
                    stepTo = $scope.steps[stepVar];
                    $scope.lastVisitedStep = stepVar;
                } else {
                    stepTo = _.findWhere($scope.steps, {title: stepVar});
                }
                $scope.goTo(stepTo);
            };


            this.finish = function() {
                if ($scope.onFinish) {
                    $scope.onFinish();
                }
            };


            this.cancel = this.previous = function() {
                var index = _.indexOf($scope.steps , $scope.selectedStep);
                if (index === 0) {
                    throw new Error("Can't go back. It's already in step 0");
                } else {
                    $scope.goTo($scope.steps[index - 1]);
                }
            };
        }]
    };
});

function wizardButtonDirective(action) {
    angular.module('mgo-angular-wizard')
        .directive(action, function() {
            return {
                restrict: 'A',
                replace: false,
                require: '^wizard',
                link: function($scope, $element, $attrs, wizard) {

                    $element.on("click", function(e) {
                        e.preventDefault();
                        $scope.$apply(function() {
                            $scope.$eval($attrs[action]);
                            wizard[action.replace("wz", "").toLowerCase()]();
                        });
                    });
                }
            };
        });
}

wizardButtonDirective('wzNext');
wizardButtonDirective('wzPrevious');
wizardButtonDirective('wzFinish');
wizardButtonDirective('wzCancel');

angular.module('mgo-angular-wizard').factory('WizardHandler', function() {
   var service = {};
   
   var wizards = {};
   
   service.defaultName = "defaultWizard";
   
   service.addWizard = function(name, wizard) {
       wizards[name] = wizard;
   };
   
   service.removeWizard = function(name) {
       delete wizards[name];
   };
   
   service.wizard = function(name) {
       var nameToUse = name;
       if (!name) {
           nameToUse = service.defaultName;
       }
       
       return wizards[nameToUse];
   };
   
   return service;
});