/**
 * This Source Code is licensed under the MIT license. If a copy of the
 * MIT-license was not distributed with this file, You can obtain one at:
 * http://opensource.org/licenses/mit-license.html.
 *
 * @author: Hein Rutjes (IjzerenHein)
 * @license MIT
 * @copyright Gloey Apps, 2015
 */
define(function(require) {

    // import dependencies
    var Engine = require('famous/core/Engine');
    var isMobile = require('ismobilejs');
    var TabBarController = require('famous-flex/widgets/TabBarController');
    var LocationView = require('./views/LocationView');
    var MapView = require('famous-map/MapView');
    var ChatView = require('./views/ChatView');

    // On mobile, disable app-mode and install the custom MapView
    // touch-handler so that Google Maps works.
    if (isMobile.any) {
        Engine.setOptions({appMode: false});
        MapView.installSelectiveTouchMoveHandler();
    }

    // create the main context
    var mainContext = Engine.createContext();

    // Create tab-bar controller
    var tabBarController = new TabBarController({
        tabBarSize: 150,
        tabBarPosition: TabBarController.Position.LEFT
    });
    tabBarController.setItems([
        {tabItem: 'Map', view: new LocationView()},
        {tabItem: 'Chat', view: new ChatView()}
    ]);
    mainContext.add(tabBarController);
});
