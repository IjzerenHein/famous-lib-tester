/**
 * This Source Code is licensed under the MIT license. If a copy of the
 * MIT-license was not distributed with this file, You can obtain one at:
 * http://opensource.org/licenses/mit-license.html.
 *
 * @author: Hein Rutjes (IjzerenHein)
 * @license MIT
 * @copyright Gloey Apps, 2016
 */

/*global define*/
/*eslint no-use-before-define:0*/
define(function(require, exports, module) {

    // import dependencies
    var Firebase = require('firebase');
    var LinkedListViewSequence = require('famous-flex/LinkedListViewSequence');
    var Surface = require('famous/core/Surface');
    var View = require('famous/core/View');
    var FlexScrollView = require('famous-flex/FlexScrollView');
    var LayoutDockHelper = require('famous-flex/helpers/LayoutDockHelper');
    var LayoutController = require('famous-flex/LayoutController');
    var AutosizeTextareaSurface = require('famous-autosizetextarea/AutosizeTextareaSurface');
    var Timer = require('famous/utilities/Timer');
    var InputSurface = require('famous/surfaces/InputSurface');
    var RefreshLoader = require('famous-refresh-loader/RefreshLoader');
    var moment = require('moment/moment');
    var cuid = require('cuid');
    var Handlebars = require('handlebars/dist/handlebars');
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

    module.exports = ChatView;
});
