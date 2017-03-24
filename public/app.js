(function() {

    /**
     * Declare the app object and set elements
     */
    var app = {
        addTodo            : document.querySelector('#addTodo'),
        cancelTodo         : document.querySelector('#cancelTodo'),
        connectionStatus   : document.querySelector('#connectionStatus'),
        loginForm          : document.querySelector('#loginForm'),
        loginFormContainer : document.querySelector('#loginFormContainer'),
        pendingList        : document.querySelector('#pendingList'),
        refreshButton      : document.querySelector('#refreshButton'),
        todoCheckbox       : document.querySelector('#todoItemDone'),
        todoForm           : document.querySelector('#todoFormContainer form'),
        todoFormContainer  : document.querySelector('#todoFormContainer'),
        todoId             : document.querySelector('#todoId'),
        todoLegend         : document.querySelector('#todoFormContainer legend'),
        todoList           : document.querySelector('#todoList'),
        todoName           : document.querySelector('#todoItemName'),
        todoListContainer  : document.querySelector('#todoListContainer'),
        userName           : document.querySelector('#userName')
    };


    /* Add some functions to the app */

    /**
     * Get the pending items from IndexedDB to show...
     */
    app.loadPending = function loadPending() {
        app.pendingList.innerHTML = '';
        store.outbox('readonly').then(function (outbox) {
            return outbox.getAll();
        }).then(function (messages) {
            var action;
            var div;
            var fragment;
            var h3;
            var i;
            var text;

            if (messages && messages.length) {
                fragment = document.createDocumentFragment();
                h3 = document.createElement('h3');
                text = document.createTextNode('Pending changes...');
                h3.appendChild(text);
                fragment.appendChild(h3);

                for (i = 0; i < messages.length; i++) {
                    action = (messages[i].item._id) ? 'Updating "' : 'Adding "';
                    div    = document.createElement('div');
                    text   = document.createTextNode(action + messages[i].item.name + '"');

                    div.appendChild(text);
                    fragment.appendChild(div);
                }
                app.pendingList.appendChild(fragment);
            }
        });
    };

    /**
     * Handle the submission of the Add/Edit "to do" form
     */
    app.todoSubmitHandler = function(event) {
        event.preventDefault();
        var item = {
            _id    : app.todoId.value,
            name   : app.todoName.value,
            isDone : app.todoCheckbox.checked,
            user   : app.user
        };
        app.saveItem(item);
    };

    /**
     * Render the add/edit form
     *
     * @param item the "to do" item to render
     */
    app.renderForm = function renderForm(item) {
        app.todoId.value = item._id;
        app.todoName.value = item.name;
        app.todoCheckbox.checked = item.isDone;
        app.todoLegend.innerHTML = item._id ? 'Edit' : 'Add';
        app.todoListContainer.setAttribute('class', 'hidden');
        app.todoFormContainer.setAttribute('class', '');
    };

    /**
     * online event handling.
     */
    app.setOnline = function isOnline() {
        if (navigator.onLine) {
            app.connectionStatus.setAttribute('class', 'online');
        } else {
            app.connectionStatus.setAttribute('class', 'offline');
        }
    };

    /**
     * Show the login form
     */
    app.showLogin = function showLogin() {
        app.loginFormContainer.setAttribute('class', '');
        app.todoListContainer.setAttribute('class', 'hidden');
        app.todoFormContainer.setAttribute('class', 'hidden');
    };

    /**
     * Clear out any values in the "to do" form and show the list/controls
     */
    app.showTodoList = function showTodoList(event) {
        if (event) {
            event.preventDefault();
        }
        app.loadPending();
        app.todoId.value = '';
        app.todoName.value = '';
        app.todoCheckbox.checked = false;
        app.todoLegend.innerHTML = '';
        app.todoListContainer.setAttribute('class', '');
        app.todoFormContainer.setAttribute('class', 'hidden');
        app.loginFormContainer.setAttribute('class', 'hidden');
    };

    /**
     * Start the application.
     */
    app.start = function start() {
        var user;

        if (window.localStorage) {
            user = localStorage.getItem('todoPWAid');
        }
        app.setOnline();
        if (user) {
            app.user = user;
            app.getList();
        } else {
            app.showLogin();
        }
    };

    /* End Functions */


    /* Add some more functions to interface with the service */

    /**
     * Get the list of todos and render them
     */
    app.getList = function getList() {
        var request = new XMLHttpRequest();
        var url = '/todos/' + encodeURIComponent(app.user);

        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response  = JSON.parse(request.response);
                    var fragment  = document.createDocumentFragment();
                    var a;
                    var className;
                    var div;
                    var i;
                    var items;
                    var text;

                    if (response.length) {
                        app.todoList.innerHTML = '';

                        for (i = 0; i < response.length; i++) {
                            className = response[i].isDone ? 'complete' : 'not-done';
                            div = document.createElement('div');
                            text = document.createTextNode(response[i].name);
                            a = document.createElement('a');

                            a.setAttribute('class', 'editItem');
                            a.setAttribute('href', '#');
                            a.setAttribute('id', response[i]._id);
                            a.appendChild(text);

                            div.setAttribute('id', 'todo' + response[i]._id);
                            div.setAttribute('class', className);
                            div.appendChild(a);

                            fragment.appendChild(div);
                        }
                        app.todoList.appendChild(fragment);

                        items = document.querySelectorAll('.editItem');
                        for (i = 0; i < items.length; i++) {
                            items[i].addEventListener('click', function (event) {
                                event.preventDefault();
                                app.editItem(event.currentTarget.id);
                            });
                        }
                    }
                    app.showTodoList();

                } else {
                    // error
                }
            } else {
                // not done yet...
            }
        };
        request.open('GET', url);
        request.send();
    };

    /**
     * Edit the specified item. Retrieve it from the service and
     * then render the form.
     *
     * @param id the ID of the specified "to do" item.
     */
    app.editItem = function editItem(id) {
        var request = new XMLHttpRequest();
        var url = '/todo/' + id;

        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    app.renderForm(response);
                } else {
                    // error
                }
            } else {
                // not done yet...
            }
        };
        request.open('GET', url);
        request.send();
    };

    /**
     * Save the specified item. Depending on whether or not it has
     * an ID, it will do a PUT (id exists - updating) or POST (id
     * does not exist - creating)
     *
     * @param item the "to do" item to save
     */
    app.saveItem = function saveItem(item) {
        var request = new XMLHttpRequest();
        var method = 'POST';
        var url = '/todo';

        // if the item as an id, we need to update/PUT
        if (item._id) {
            method = 'PUT';
            url += '/' + item._id;
        }

        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    app.getList();
                } else {
                    console.log('[app] error saving, show list anyway');
                    app.getList();
                }
            } else {
                // not done yet...
            }
        };
        request.open(method, url);
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(item));
    };

    /* End service interface functions */


    /* Add some event handlers to the app. Some will use the functions above */

    /**
     * Handle the click event for the 'add to do' button
     */
    app.addTodo.addEventListener('click', function(event) {
        event.preventDefault();
        app.renderForm({
            _id    : '',
            name   : '',
            isDone : false
        });
    });

    /**
     * Handler for the refresh button
     */
    app.refreshButton.addEventListener('click', function(event) {
        event.preventDefault();
        app.getList();
    });

    /**
     * Handle the click event for the cancel link on the add/edit form
     */
    app.cancelTodo.addEventListener('click', app.showTodoList);

    /**
     * Event handler for submitting the login form
     */
    app.loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        var user = app.userName.value;
        if (user) {
            if (window.localStorage) {
                localStorage.setItem('todoPWAid', user);
            }
            app.user = user;
            app.getList();
        }
    });

    /* End event handlers */



    // Check if the browser supports service worker and background sync!
    if ('serviceWorker' in navigator) {

        // If the app is loaded while offline (or unable to connect to the server)
        // this will result in a very nebulous error that simply says:
        // "An unknown error occurred when fetching the script."
        navigator.serviceWorker.register('./serviceworker.js')
            .then(function(registration) {
                var sw;
                if (registration.installing) {
                    console.log('[app] installing service worker...');
                    sw = registration.installing;

                } else if (registration.waiting) {
                    console.log('[app] waiting for service worker...');
                    sw = registration.waiting;

                } else if (registration.active) {
                    console.log('[app] service worker active!');
                    sw = registration.active;

                    // SW is already active, let's get the list
                    app.start();
                }

                // Use this to listen for completion of install/activation before starting app
                if (sw) {
                    sw.addEventListener('statechange', function(e) {
                        console.log('[app] service worker is ' + e.target.state);
                        if ('activated' === e.target.state) {
                            console.log('[app] service worker is activated, get initial list');

                            // now that service worker is installed/activated, start the app
                            app.start();
                        }
                    });
                }

                // Check if the browser supports background sync
                if ('sync' in registration) {
                    console.log('[app] Browser supports sync, registering event');

                    // Listen for messages from the service worker.
                    navigator.serviceWorker.addEventListener('message', function(event) {
                        console.log('[app] received message from service worker');

                        if (event.data && event.data.name) {
                            if (event.data.name === 'syncComplete') {
                                app.getList();
                            } else if (event.data.name === 'syncFailed') {
                                alert('Network problem. Do not worry, though! The app will retry in the background when you close the page!');
                            }
                        }
                    });

                    // Add a 'submit' listener. This will place a message in IndexedDB for the
                    // service worker to process in the background.
                    app.todoForm.addEventListener('submit', function(event) {
                        event.preventDefault();
                        new Promise(function(resolve, reject) {
                            Notification.requestPermission(function (result) {
                                if (result === 'granted') {
                                    resolve();
                                }
                            }).then(function() {
                                var method = 'POST';
                                var url    = '/todo';
                                // if it has an _id prop, change to 'PUT'
                                if (app.todoId.value) {
                                    method = 'PUT';
                                    url    = '/todo/' + app.todoId.value;
                                }
                                var message = {
                                    method : method,
                                    url    : url,
                                    item   : {
                                        _id    : app.todoId.value,
                                        name   : app.todoName.value,
                                        isDone : app.todoCheckbox.checked,
                                        user   : app.user
                                    }
                                };

                                store.outbox('readwrite').then(function(outbox) {
                                    return outbox.put(message);
                                }).then(function() {
                                    console.log('[app] registering sync');
                                    return registration.sync.register('outbox');

                                }).then(function() {
                                    app.showTodoList();

                                }).catch(function(err) {
                                    console.error('[app] Error with "sync"', err);
                                });
                            });
                        });
                    });

                    /*
                     * Listen for the 'online' event. When it happens, call the setOnline() function
                     * to toggle the class on the indicator, AND post a message to the service worker
                     * to process the outbox.
                     */
                    window.addEventListener('online', function(event) {
                        app.setOnline();
                        return new Promise(function(resolve, reject) {
                            var messageChannel = new MessageChannel();
                            navigator.serviceWorker.controller.postMessage({
                                name: 'processOutbox'
                            }, [messageChannel.port2]);
                        });
                    });
                    window.addEventListener('offline', app.setOnline);

                } else {
                    console.log('[app] Browser supports service worker, but not sync');

                    // attach the plain old submit handler to the event
                    app.todoForm.addEventListener('submit', app.todoSubmitHandler);
                    window.addEventListener('online', app.setOnline);
                    window.addEventListener('offline', app.setOnline);
                }

            }).catch(function(error) {
                console.log('[app] Error registering service worker: ', error);
            });

    } else {
        console.log('[app] browser does not support service workers');

        // Add some event listeners for browsers that do not support serviceWorker
        app.todoForm.addEventListener('submit', app.todoSubmitHandler);
        window.addEventListener('online', app.setOnline);
        window.addEventListener('offline', app.setOnline);

        // Start the app!
        app.start();
    }
}());
