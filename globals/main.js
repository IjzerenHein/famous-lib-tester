/*global famous, famousmap, famousflex*/

// import dependencies
var Engine = famous.core.Engine;
//var isMobile = require('ismobilejs');
var MapView = famousmap.MapView;
var View = famous.core.View;
var AnimationController = famousflex.AnimationController;
var TabBar = famousflex.widgets.TabBar;
var LayoutDockHelper = famousflex.helpers.LayoutDockHelper;
var LayoutController = famousflex.LayoutController;
var Easing = famous.transitions.Easing;
var MapModifier = famousmap.MapModifier;
var Surface = famous.core.Surface;
var Transform = famous.core.Transform;

/**
 * @class
 * @param {Object} options Configurable options.
 * @param {Object} [options.layoutController] Options that are passed to the LayoutController.
 * @param {Object} [options.tabBar] Options that are passed to the TabBar.
 * @param {Object} [options.animationController] Options that are passed to the AnimationController.
 * @alias module:TabBarController
 */
function TabBarController(options) {
    View.apply(this, arguments);

    _createRenderables.call(this);
    _createLayout.call(this);
    _setListeners.call(this);
}
TabBarController.prototype = Object.create(View.prototype);
TabBarController.prototype.constructor = TabBarController;

TabBarController.TabBarPosition = {
    TOP: 0,
    BOTTOM: 1,
    LEFT: 2,
    RIGHT: 3
};

/**
 * Default layout-function for the TabBarController. Supports simple
 * docking to any of the four edges.
 */
TabBarController.DEFAULT_LAYOUT = function(context, options) {
    var dock = new LayoutDockHelper(context, options);
    switch (options.tabBarPosition) {
        case TabBarController.TabBarPosition.TOP:
            dock.top('tabBar', options.tabBarSize, options.tabBarZIndex);
            break;
        case TabBarController.TabBarPosition.BOTTOM:
            dock.bottom('tabBar', options.tabBarSize, options.tabBarZIndex);
            break;
        case TabBarController.TabBarPosition.LEFT:
            dock.left('tabBar', options.tabBarSize, options.tabBarZIndex);
            break;
        case TabBarController.TabBarPosition.RIGHT:
            dock.right('tabBar', options.tabBarSize, options.tabBarZIndex);
            break;
    }
    dock.fill('content');
};

TabBarController.DEFAULT_OPTIONS = {
    layoutController: {
        layout: TabBarController.DEFAULT_LAYOUT,
        layoutOptions: {
            tabBarSize: 50,
            tabBarZIndex: 10,
            tabBarPosition: TabBarController.TabBarPosition.BOTTOM
        }
    },
    tabBar: {
        createRenderables: {
            background: true
        }
    },
    animationController: {
        transition: {duration: 300, curve: Easing.inOutQuad},
        animation: AnimationController.Animation.FadedZoom
    }
};

/**
 * Creates the renderables (tabBar, animationController).
 */
function _createRenderables() {
    this.tabBar = new TabBar(this.options.tabBar);
    this.animationController = new AnimationController(this.options.animationController);
    this._renderables = {
        tabBar: this.tabBar,
        content: this.animationController
    };
}

/**
 * Creates the outer (header-footer) layout.
 */
function _createLayout() {
    this.layout = new LayoutController(this.options.layoutController);
    this.layout.setDataSource(this._renderables);
    this.add(this.layout);
}

/**
 * Sets the listeners.
 */
function _setListeners() {
    this.tabBar.on('tabchange', function(event) {
        _updateView.call(this, event);
    }.bind(this));
}

/**
 * Updates the view-container with the selected view.
 */
function _updateView(event) {
    var index = this.tabBar.getSelectedItemIndex();
    this.animationController.halt();
    if (index >= 0) {
        this.animationController.show(this._items[index].view);
    }
    else {
        this.animationController.hide();
    }
}

/**
 * Patches the TabBarController instance's options with the passed-in ones.
 *
 * @param {Object} options Configurable options.
 * @param {Object} [options.layoutController] Options that are passed to the LayoutController.
 * @param {Object} [options.tabBar] Options that are passed to the TabBar.
 * @param {Object} [options.animationController] Options that are passed to the AnimationController.
 * @return {TabBarController} this
 */
TabBarController.prototype.setOptions = function(options) {
    View.prototype.setOptions.call(this, options);
    if (this.layout && options.layoutController) {
        this.layout.setOptions(options.layoutController);
    }
    if (this.tabBar && options.tabBar) {
        this.tabBar.setOptions(options.tabBar);
    }
    if (this.animationController && options.animationController) {
        this.animationController(options.animationController);
    }
    return this;
};

/**
 * Sets the items for the tab-bar controller.
 *
 * Example 1:
 *
 * ```javascript
 * var tabBarController = new TabBarController();
 * tabBarController.setItems([
 *   {tabItem: 'Profile', view: new ProfileView()},
 *   {tabItem: 'Map', view: new MapView()},
 *   {tabItem: 'Login', view: new LoginView()}
 *   {tabItem: 'Settings', view: new SettingsView()}
 * ]);
 *```
 *
 * @param {Array} items Array of tab-bar controller items.
 * @return {TabBarController} this
 */
TabBarController.prototype.setItems = function(items) {
    this._items = items;
    var tabItems = [];
    for (var i = 0; i < items.length; i++) {
        tabItems.push(items[i].tabItem);
    }
    this.tabBar.setItems(tabItems);
    _updateView.call(this);
    return this;
};

/**
 * Get the tab-items (also see `setItems`).
 *
 * @return {Array} tab-items
 */
TabBarController.prototype.getItems = function() {
    return this._items;
};

/**
 * @class
 * @param {Object} options Configurable options.
 * @alias module:LocationView
 */
function LocationView(options) {
    View.apply(this, arguments);

    _createMap.call(this);
    _createMarker.call(this);
}
LocationView.prototype = Object.create(View.prototype);
LocationView.prototype.constructor = LocationView;

LocationView.DEFAULT_OPTIONS = {
    classes: ['view', 'location'],
    mapView: {
        type: MapView.MapType.GOOGLEMAPS,
        mapOptions: {
            zoom: 13,
            center: {lat: 48.8570519, lng: 2.3457724}
        }
    },
    marker: {
        size: [50, 70],
        borderWidth: 3,
        pinSize: [20, 16]
    }
};

function _createMap() {
    this.mapView = new MapView(this.options.mapView);
    this.add(this.mapView);
}

/**
 * Create a nice marker on the map view.
 */
function _createMarker() {
    this.mapMarker = {
        image: new Surface({
            classes: this.options.classes.concat(['marker', 'image']),
            properties: {
                backgroundSize: 'contain'
            }
        }),
        mod: new MapModifier({
            mapView: this.mapView,
            position: this.options.mapView.mapOptions.center
        }),
        lc: new LayoutController({
            layout: function(context, size) {
                var marker = this.options.marker;
                var backSize = [marker.size[0], marker.size[1] - marker.pinSize[1]];
                var top = -marker.size[1];
                context.set('back', {
                    size: backSize,
                    translate: [backSize[0] / -2, top, 1]
                });
                var imageSize = [this.options.marker.size[0] - (this.options.marker.borderWidth * 2), this.options.marker.size[0] - (this.options.marker.borderWidth * 2)];
                context.set('image', {
                    size: imageSize,
                    translate: [imageSize[0] / -2, top + ((backSize[1] - imageSize[1]) / 2), 2]
                });
                context.set('pin', {
                    size: marker.pinSize,
                    translate: [marker.pinSize[0] / -2, top + backSize[1], 1]
                });
            }.bind(this),
            dataSource: {
                back: new Surface({
                    classes: this.options.classes.concat(['marker', 'back'])
                }),
                pin: new Surface({
                    classes: this.options.classes.concat(['marker', 'pin']),
                    content: '<div></div>'
                })
            }
        })
    };
    this.add(this.mapMarker.mod).add(this.mapMarker.lc);
    this.mapMarker.lc.insert('image', this.mapMarker.image);
}

LocationView.prototype.getTransferable = function(id) {
    if (id !== 'image') {
        return undefined;
    }
    var getSpec = function(callback) {
        var pnt = this.mapView.pointFromPosition(this.mapMarker.mod.getPosition());
        var imageSize = [this.options.marker.size[0] - (this.options.marker.borderWidth * 2), this.options.marker.size[0] - (this.options.marker.borderWidth * 2)];
        var backHeight = this.options.marker.size[1] - this.options.marker.pinSize[1];
        callback({
            size: imageSize,
            transform: Transform.translate(
                pnt.x - (imageSize[0] / 2),
                pnt.y - this.options.marker.size[1] + ((backHeight - imageSize[1]) / 2),
                0
            )
        });
    }.bind(this);
    return {
        get: function() {
            return this.mapMarker.image;
        }.bind(this),
        show: function(renderable) {
            this.mapMarker.lc.replace('image', renderable);
        }.bind(this),
        getSpec: function(callback) {
            if (this.mapView.isInitialized()) {
                getSpec.call(this, callback);
            }
            else {
                this.mapView.on('load', getSpec.bind(this, callback));
            }
        }.bind(this)
    };
};

// On mobile, disable app-mode and install the custom MapView
// touch-handler so that Google Maps works.
/*if (isMobile.any) {
    Engine.setOptions({appMode: false});
    MapView.installSelectiveTouchMoveHandler();
}*/

// create the main context
var mainContext = Engine.createContext();

// Create tab-bar controller
var tabBarController = new TabBarController({
    layoutController: {
        layoutOptions: {
            tabBarSize: 150,
            tabBarPosition: TabBarController.TabBarPosition.LEFT
        }
    }
});
tabBarController.setItems([
    {tabItem: 'Map', view: new LocationView()}
]);
mainContext.add(tabBarController);
