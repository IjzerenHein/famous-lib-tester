/*global famous, famousmap, famousflex*/

// import dependencies
var Engine = famous.core.Engine;
var MapView = famousmap.MapView;
var View = famous.core.View;
var Entity = famous.core.Entity;
var Timer = famous.core.Timer;
var Modifier = famous.core.Modifier;
var InputSurface = famous.surfaces.InputSurface;
var TextareaSurface = famous.surfaces.TextareaSurface;
var AnimationController = famousflex.AnimationController;
var LinkedListViewSequence = famousflex.LinkedListViewSequence;
var FlexScrollView = famousflex.FlexScrollView;
var TabBar = famousflex.widgets.TabBar;
var TabBarController = famousflex.widgets.TabBarController;
var LayoutDockHelper = famousflex.helpers.LayoutDockHelper;
var LayoutController = famousflex.LayoutController;
var Easing = famous.transitions.Easing;
var MapModifier = famousmap.MapModifier;
var Surface = famous.core.Surface;
var Transform = famous.core.Transform;

    /**
     * @class
     * @extends View
     * @param {Object} [options] Configuration options
     */
    function RefreshLoader(options) {
        View.apply(this, arguments);

        this._rotateOffset = 0;
        this._scale = 1;
        this.id = Entity.register(this); // register entity-id to capture size prior to rendering

        if (this.options.pullToRefresh && this.options.pullToRefreshBackgroundColor) {
            _createForeground.call(this, _translateBehind.call(this));
        }
        _createParticles.call(this, _translateBehind.call(this), this.options.particleCount);
    }
    RefreshLoader.prototype = Object.create(View.prototype);
    RefreshLoader.prototype.constructor = RefreshLoader;

    // default options
    RefreshLoader.DEFAULT_OPTIONS = {
        color: '#AAAAAA',
        particleCount: 10,
        particleSize: 6,
        rotateVelocity: 0.09,
        hideVelocity: 0.05,
        quickHideVelocity: 0.2,
        pullToRefresh: false,
        pullToRefreshBackgroundColor: 'white',
        pullToRefreshDirection: 1,
        pullToRefreshFooter: false,
        pullToRefreshFactor: 1.5 // pull 1.5x the size to activate refresh
    };

    /**
     * Helper function for giving all surfaces the correct z-index.
     */
    function _translateBehind() {
        if (this._zNode) {
            this._zNode = this._zNode.add(new Modifier({
                transform: Transform.behind
            }));
        }
        else {
            this._zNode = this.add(new Modifier({
                transform: Transform.behind
            }));
        }
        return this._zNode;
    }

    /**
     * Creates the particles
     */
    function _createParticles(node, count) {
        this._particles = [];
        var options = {
            size: [this.options.particleSize, this.options.particleSize],
            properties: {
                backgroundColor: this.options.color,
                borderRadius: '50%'
            }
        };
        for (var i = 0; i < count; i++) {
            var particle = {
                surface: new Surface(options),
                mod: new Modifier({})
            };
            this._particles.push(particle);
            node.add(particle.mod).add(particle.surface);
        }
    }

    /**
     * Creates the foreground behind which the particles can hide in case of pull to refresh.
     */
    function _createForeground(node) {
        this._foreground = {
            surface: new Surface({
                size: this.options.size,
                properties: {
                    backgroundColor: this.options.pullToRefreshBackgroundColor
                }
            }),
            mod: new Modifier({})
        };
        node.add(this._foreground.mod).add(this._foreground.surface);
    }

     /**
     * Positions/rotates partciles.
     */
    var devicePixelRatio = window.devicePixelRatio || 1;
    function _positionParticles(renderSize) {
        var shapeSize = this.options.size[this.options.pullToRefreshDirection] / 2;
        var visiblePerc = Math.min(Math.max(renderSize[this.options.pullToRefreshDirection] / (this.options.size[this.options.pullToRefreshDirection] * 2), 0), 1);
        switch (this._pullToRefreshStatus) {
            case 0:
            case 1:
                this._rotateOffset = 0;
                this._scale = 1;
                break;
            case 2:
                visiblePerc = 1;
                this._rotateOffset += this.options.rotateVelocity;
                break;
            case 3:
                visiblePerc = 1;
                this._rotateOffset += this.options.rotateVelocity;
                this._scale -= this.options.hideVelocity;
                this._scale = Math.max(0, this._scale);
                break;
            case 4:
                visiblePerc = 1;
                this._rotateOffset += this.options.rotateVelocity;
                this._scale -= this.options.quickHideVelocity;
                this._scale = Math.max(0, this._scale);
                break;
        }
        //console.log('visiblePerc: ' + visiblePerc + ', renderSize: ' + JSON.stringify(renderSize));
        var rTotal = visiblePerc * Math.PI * 2;
        for (var i = 0, cnt = this._particles.length; i < cnt; i++) {
            var mod = this._particles[i].mod;
            var r = (((i / cnt) * rTotal) - (Math.PI / 2)) + this._rotateOffset + (this.options.pullToRefreshFooter ? Math.PI : 0);
            var x = Math.cos(r) * (shapeSize / 2) * this._scale;
            var y = Math.sin(r) * (shapeSize / 2) * this._scale;
            if (this.options.pullToRefreshDirection) {
                x += (renderSize[0] / 2);
                y += shapeSize;
                y = Math.round(y * devicePixelRatio) / devicePixelRatio;
            }
            else {
                x += shapeSize;
                y += (renderSize[1] / 2);
                x = Math.round(x * devicePixelRatio) / devicePixelRatio;
            }
            mod.transformFrom(Transform.translate(x, y, 0));
            mod.opacityFrom(this._scale);
        }
    }

    /**
     * Positions the foreground in front of the particles.
     */
    function _positionForeground(renderSize) {
        if (this._pullToRefreshDirection) {
            this._foreground.mod.transformFrom(Transform.translate(0, renderSize[1], 0));
        }
        else {
            this._foreground.mod.transformFrom(Transform.translate(renderSize[0], 0, 0));
        }
    }

    /**
     * Ensure that our commit is called passing along the size.
     * @private
     */
    RefreshLoader.prototype.render = function render() {
        return [this.id, this._node.render()];
    };

    /**
     * Position renderables based on size
     * @private
     */
    RefreshLoader.prototype.commit = function commit(context) {
        _positionParticles.call(this, context.size);
        if (this._foreground) {
            _positionForeground.call(this, context.size);
        }
        return {};
    };

    /**
     * Called by the flex ScrollView whenever the pull-to-refresh renderable is shown
     * or the state has changed.
     *
     * @param {Number} status Status, 0: hidden, 1: pulling, 2: active, 3: completed, 4: hidding
     */
    RefreshLoader.prototype.setPullToRefreshStatus = function(status) {
        this._pullToRefreshStatus = status;
    };

    /**
     * Called by the flex ScrollView to get the size on how far to pull before the
     * refresh is activated.
     *
     * @return {Size} Pull to refresh size
     */
    RefreshLoader.prototype.getPullToRefreshSize = function() {
        if (this.options.pullToRefreshDirection) {
            return [this.options.size[0], this.options.size[1] * this.options.pullToRefreshFactor];
        }
        else {
            return [this.options.size[1] * this.options.pullToRefreshFactor, this.options.size[1]];
        }
    };

    /**
     * @class
     * @extends TextareaSurface
     * @param {Object} [options] Configuration options
     */
    function AutosizeTextareaSurface(options) {
        this._heightInvalidated = true;
        this._oldCachedSize = [0, 0];
        _createHiddenSurface.call(this);
        TextareaSurface.apply(this, arguments);
        this.on('change', _onValueChanged.bind(this));
        this.on('keyup', _onValueChanged.bind(this));
        this.on('keydown', _onValueChanged.bind(this));
    }
    AutosizeTextareaSurface.prototype = Object.create(TextareaSurface.prototype);
    AutosizeTextareaSurface.prototype.constructor = AutosizeTextareaSurface;

    //
    // Called whenever the value is changed, copies the value to the
    // hidden TextArea surface.
    //
    function _onValueChanged(event) {
        this._heightInvalidated = true;
    }

    /**
     * Create the hidden text-area surface
     */
    function _createHiddenSurface() {
        this._preferredScrollHeight = 0;
        this._hiddenTextarea = new TextareaSurface({});
        this.setProperties({});
    }

    /**
     * Checks whether the scroll-height has changed and when so
     * emits an event about the preferred height.
     */
    AutosizeTextareaSurface.prototype.render = function render() {

        // Return render-spec of both this textArea and the hidden
        // text-area so that they are both rendered.
        return [this._hiddenTextarea.id, this.id];
    };

    var oldCommit = AutosizeTextareaSurface.prototype.commit;
    /**
     * Apply changes from this component to the corresponding document element.
     * This includes changes to classes, styles, size, content, opacity, origin,
     * and matrix transforms.
     *
     * @private
     * @method commit
     * @param {Context} context commit context
     */
    AutosizeTextareaSurface.prototype.commit = function commit(context) {

        // Call base class
        oldCommit.apply(this, arguments);

        // Check if height has been changed
        if ((this._oldCachedSize[0] !== context.size[0]) ||
            (this._oldCachedSize[1] !== context.size[1])) {
            this._oldCachedSize[0] = context.size[0];
            this._oldCachedSize[1] = context.size[1];
            this._heightInvalidated = true;
        }

        // Caluclate preferred height
        if (this._currentTarget && this._hiddenTextarea._currentTarget && this._heightInvalidated) {
            this._hiddenTextarea._currentTarget.value = this._currentTarget.value;
            this._heightInvalidated = false;

            // Calculate ideal scrollheight
            this._hiddenTextarea._currentTarget.rows = 1;
            this._hiddenTextarea._currentTarget.style.height = '';
            var scrollHeight = this._hiddenTextarea._currentTarget.scrollHeight;
            if (scrollHeight !== this._preferredScrollHeight) {
                this._preferredScrollHeight = scrollHeight;
                //console.log('scrollHeight changed: ' + this._preferredScrollHeight);
                this._eventOutput.emit('scrollHeightChanged', this._preferredScrollHeight);
            }
        }
    };

    /**
     * Get the height of the scrollable content.
     *
     * @return {Number} Ideal height that would fit all the content.
     */
    AutosizeTextareaSurface.prototype.getScrollHeight = function() {
        return this._preferredScrollHeight;
    };

    /**
     * Copy set properties to hidden text-area and ensure that it stays hidden.
     */
    var oldSetProperties = AutosizeTextareaSurface.prototype.setProperties;
    AutosizeTextareaSurface.prototype.setProperties = function setProperties(properties) {
        properties = properties || {};
        var hiddenProperties = {};
        for (var key in properties) {
            hiddenProperties[key] = properties[key];
        }
        hiddenProperties.visibility = 'hidden';
        this._hiddenTextarea.setProperties(hiddenProperties);
        this._heightInvalidated = true;
        return oldSetProperties.call(this, properties);
    };

    /**
     * Override methods and forward to hidden text-area, so that they use the
     * same settings.
     */
    var oldSetAttributes = AutosizeTextareaSurface.prototype.setAttributes;
    AutosizeTextareaSurface.prototype.setAttributes = function setAttributes(attributes) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setAttributes(attributes);
        return oldSetAttributes.call(this, attributes);
    };
    var oldAddClass = AutosizeTextareaSurface.prototype.addClass;
    AutosizeTextareaSurface.prototype.addClass = function addClass(className) {
        this._heightInvalidated = true;
        this._hiddenTextarea.addClass(className);
        return oldAddClass.call(this, className);
    };
    var oldRemoveClass = AutosizeTextareaSurface.prototype.removeClass;
    AutosizeTextareaSurface.prototype.removeClass = function removeClass(className) {
        this._heightInvalidated = true;
        this._hiddenTextarea.removeClass(className);
        return oldRemoveClass.call(this, className);
    };
    var oldToggleClass = AutosizeTextareaSurface.prototype.toggleClass;
    AutosizeTextareaSurface.prototype.toggleClass = function toggleClass(className) {
        this._heightInvalidated = true;
        this._hiddenTextarea.toggleClass(className);
        return oldToggleClass.call(this, className);
    };
    var oldSetClasses = AutosizeTextareaSurface.prototype.setClasses;
    AutosizeTextareaSurface.prototype.setClasses = function setClasses(classList) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setClasses(classList);
        return oldSetClasses.call(this, classList);
    };
    var oldSetContent = AutosizeTextareaSurface.prototype.setContent;
    AutosizeTextareaSurface.prototype.setContent = function setContent(content) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setContent(content);
        return oldSetContent.call(this, content);
    };
    var oldSetOptions = AutosizeTextareaSurface.prototype.setOptions;
    AutosizeTextareaSurface.prototype.setOptions = function setOptions(options) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setOptions(options);
        return oldSetOptions.call(this, options);
    };
    var oldSetValue = AutosizeTextareaSurface.prototype.setValue;
    AutosizeTextareaSurface.prototype.setValue = function setValue(str) {
        this._heightInvalidated = true;
        return oldSetValue.call(this, str);
    };
    var oldSetWrap = AutosizeTextareaSurface.prototype.setWrap;
    AutosizeTextareaSurface.prototype.setWrap = function setWrap(str) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setWrap(str);
        return oldSetWrap.call(this, str);
    };
    var oldSetColumns = AutosizeTextareaSurface.prototype.setColumns;
    AutosizeTextareaSurface.prototype.setColumns = function setColumns(num) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setColumns(num);
        return oldSetColumns.call(this, num);
    };
    var oldSetRows = AutosizeTextareaSurface.prototype.setRows;
    AutosizeTextareaSurface.prototype.setRows = function setRows(num) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setRows(num);
        return oldSetRows.call(this, num);
    };
    var oldSetPlaceholder = AutosizeTextareaSurface.prototype.setPlaceholder;
    AutosizeTextareaSurface.prototype.setPlaceholder = function setPlaceholder(str) {
        this._heightInvalidated = true;
        this._hiddenTextarea.setPlaceholder(str);
        return oldSetPlaceholder.call(this, str);
    };

    /**
     * Place the document element this component manages into the document.
     *
     * This fixes the issue that the value cannot be set to an empty string:
     * https://github.com/Famous/famous/issues/414
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    AutosizeTextareaSurface.prototype.deploy = function deploy(target) {
        target.placeholder = this._placeholder || '';
        target.value = this._value;
        target.name = this._name;
        if (this._wrap !== ''){
            target.wrap = this._wrap;
        }
        if (this._cols !== ''){
            target.cols = this._cols;
        }
        if (this._rows !== ''){
            target.rows = this._rows;
        }
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

    // templates
    var chatBubbleTemplate = Handlebars.compile('<div class="back"><span class="author">{{author}}</span><div class="time">{{time}}</div><div class="message">{{message}}</div></div>');
    var daySectionTemplate = Handlebars.compile('<span class="text">{{text}}</span>');

    /**
     * @class
     * @param {Object} options Configurable options.
     * @alias module:LocationView
     */
    function ChatView(options) {
        View.apply(this, arguments);

        this.viewSequence = new LinkedListViewSequence();
        _createLayout.call(this);
        _createPullToRefreshCell.call(this);
        _setupFirebase.call(this);
    }
    ChatView.prototype = Object.create(View.prototype);
    ChatView.prototype.constructor = ChatView;

    ChatView.DEFAULT_OPTIONS = {
        classes: ['view', 'chat']
    };

    //
    // Main layout, bottom text input, top chat messages
    //
    function _createLayout() {
        this.layout = new LayoutController({
            layout: function(context, options) {
                var dock = new LayoutDockHelper(context, options);
                dock.top('header', options.headerSize, 1);
                dock.bottom('footer', options.footerSize, 1);
                dock.fill('content', 1);
            },
            layoutOptions: {
                headerSize: 34,
                footerSize: 50
            },
            dataSource: {
                header: _createNameBar.call(this),
                content: _createScrollView.call(this),
                footer: _createMessageBar.call(this)
            }
        });
        this.add(this.layout);
    }

    //
    // Creates the top input field for the name
    //
    function _createNameBar() {
        this.nameBar = new InputSurface({
            classes: ['name-input'],
            placeholder: 'Your name...',
            value: localStorage.name
        });
        this.nameBar.on('change', function() {
            localStorage.name = nameBar.getValue();
        }.bind(this));
        return this.nameBar;
    }

    //
    // Message-bar holding textarea input and send button
    //
    function _createMessageBar() {
        var back = new Surface({
            classes: ['message-back']
        });
        this.messageBar = new LayoutController({
            layout: {dock: [
                ['fill', 'back'],
                ['left', undefined, 8],
                ['top', undefined, 8],
                ['right', undefined, 8],
                ['bottom', undefined, 8],
                ['right', 'send', undefined, 1],
                ['fill', 'input', 1]
            ]},
            dataSource: {
                back: back,
                input: _createMessageInput.call(this),
                send: _createSendButton.call(this)
            }
        });
        return this.messageBar;
    }

    //
    // Message-input textarea
    //
    function _createMessageInput() {
        this.messageInputTextArea = new AutosizeTextareaSurface({
            classes: ['message-input'],
            placeholder: 'famous-flex-chat...',
            properties: {
                resize: 'none'
            }
        });
        this.messageInputTextArea.on('scrollHeightChanged', _updateMessageBarHeight.bind(this));
        this.messageInputTextArea.on('keydown', function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                _sendMessage.call(this);
            }
        }.bind(this));
        return this.messageInputTextArea;
    }

    //
    // Updates the message-bar height to accomate for the text that
    // was entered in the message text-area.
    //
    function _updateMessageBarHeight() {
        var height = Math.max(Math.min(this.messageInputTextArea.getScrollHeight() + 16, 200), 50);
        if (this.layout.getLayoutOptions().footerSize !== height) {
            this.layout.setLayoutOptions({
                footerSize: height
            });
            return true;
        }
        return false;
    }

    //
    // Create send button
    //
    function _createSendButton() {
        var button = new Surface({
            classes: ['message-send'],
            content: 'Send',
            size: [60, undefined]
        });
        button.on('click', _sendMessage.bind(this));
        return button;
    }

    //
    // Create scrollview
    //
    function _createScrollView() {
        this.scrollView = new FlexScrollView({
            layoutOptions: {
                // callback that is called by the layout-function to check
                // whether a node is a section
                isSectionCallback: function(renderNode) {
                    return renderNode.properties.isSection;
                },
                margins: [5, 0, 0, 0]
            },
            dataSource: this.viewSequence,
            autoPipeEvents: true,
            flow: true,
            alignment: 1,
            mouseMove: true,
            debug: true,
            pullToRefreshHeader: this.pullToRefreshHeader
        });
        this.scrollView.on('refresh', function(event) {
            var queryKey = firstKey;
            this.fbMessages.endAt(null, firstKey).limitToLast(2).once('value', function(snapshot) {
                var val = snapshot.val();
                for (var key in val) {
                    if (key !== queryKey) {
                        _addMessage.call(this, val[key], true, key);
                    }
                }
                Timer.setTimeout(function() {
                    this.scrollView.hidePullToRefresh(event.footer);
                }.bind(this), 200);
            }.bind(this));
        });
        return this.scrollView;
    }

    //
    // Adds a message to the scrollview
    //
    function _addMessage(data, top, key) {
        var time = moment(data.timeStamp || new Date());
        data.time = time.format('LT');
        if (!data.author || (data.author === '')) {
            data.author = 'Anonymous coward';
        }

        // Store first key
        this.firstKey = this.firstKey || key;
        if (top && key) {
            this.firstKey = key;
        }

        // Insert section
        var day = time.format('LL');
        if (!top && (day !== this.lastSectionDay)) {
            this.lastSectionDay = day;
            this.firstSectionDay = this.firstSectionDay || day;
            this.scrollView.push(_createDaySection.call(this, day));
        }
        else if (top && (day !== this.firstSectionDay)) {
            this.firstSectionDay = day;
            this.scrollView.insert(0, _createDaySection.call(this, day));
        }

        //console.log('adding message: ' + JSON.stringify(data));
        var chatBubble = _createChatBubble.call(this, data);
        if (top) {
            this.scrollView.insert(1, chatBubble);
        }
        else {
            this.scrollView.push(chatBubble);
        }
        if (!top) {

            // Scroll the latest (newest) chat message
            if (this.afterInitialRefresh) {
                this.scrollView.goToLastPage();
                this.scrollView.reflowLayout();
            }
            else {

                // On startup, set datasource to the last page immediately
                // so it doesn't scroll from top to bottom all the way
                this.viewSequence = this.viewSequence.getNext() || this.viewSequence;
                this.scrollView.setDataSource(this.viewSequence);
                this.scrollView.goToLastPage();
                if (this.afterInitialRefreshTimerId === undefined) {
                    this.afterInitialRefreshTimerId = Timer.setTimeout(function() {
                        this.afterInitialRefresh = true;
                    }.bind(this), 100);
                }
            }
        }
    }

    //
    // setup firebase
    //
    function _setupFirebase() {
        this.fbMessages = new Firebase('https://famous-flex-chat.firebaseio.com/messages');
        this.fbMessages.limitToLast(30).on('child_added', function(snapshot) {
            _addMessage.call(this, snapshot.val(), false, snapshot.key());
        }.bind(this));
    }

    //
    // Create a chat-bubble
    //
    function _createChatBubble(data) {
        var surface = new Surface({
            size: [undefined, true],
            classes: ['message-bubble', (data.userId === _getUserId.call(this)) ? 'send' : 'received'],
            content: chatBubbleTemplate(data),
            properties: {
                message: data.message
            }
        });
        return surface;
    }

    //
    // Create a day section
    //
    function _createDaySection(day) {
        return new Surface({
            size: [undefined, 42],
            classes: ['message-day'],
            content: daySectionTemplate({text: day}),
            properties: {
                isSection: true
            }
        });
    }

    //
    // Generates a unique id for every user so that received messages
    // can be distinguished comming from this user or another user.
    //
    function _getUserId() {
        if (!this.userId) {
            this.userId = localStorage.userId;
            if (!this.userId) {
                this.userId = cuid();
                localStorage.userId = this.userId;
            }
        }
        return this.userId;
    }

    //
    // Sends a new message
    //
    function _sendMessage() {
        var value = this.messageInputTextArea.getValue();
        if (!value || (value === '')) {
            return;
        }
        this.messageInputTextArea.setValue('');
        this.fbMessages.push({
            author: this.nameBar.getValue(),
            userId: _getUserId.call(this),
            message: value,
            timeStamp: new Date().getTime()
        });
        this.messageInputTextArea.focus();
    }

    /**
     * Create pull to refresh header
     */
    function _createPullToRefreshCell() {
        this.pullToRefreshHeader = new RefreshLoader({
            size: [undefined, 60],
            pullToRefresh: true,
            pullToRefreshBackgroundColor: 'white'
        });
    }



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
    tabBarSize: 150,
    tabBarPosition: TabBarController.Position.LEFT
});
tabBarController.setItems([
    {tabItem: 'Map', view: new LocationView()},
    {tabItem: 'Chat', view: new ChatView()}
]);
mainContext.add(tabBarController);
