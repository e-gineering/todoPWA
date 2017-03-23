(function() {

    /**
     * Declare the app object and set elements
     */
    var app = {
        addTodo            : document.querySelector('#addTodo'),
        cancelTodo         : document.querySelector('#cancelTodo'),
        connectionStatus   : document.querySelector('#connectionStatus'),
        controlsContainer  : document.querySelector('#controlsContainer'),
        loginForm          : document.querySelector('#loginForm'),
        loginFormContainer : document.querySelector('#loginFormContainer'),
        refreshButton      : document.querySelector('#refreshButton'),
        todoCheckbox       : document.querySelector('#todoItemDone'),
        todoForm           : document.querySelector('#todoFormContainer form'),
        todoFormContainer  : document.querySelector('#todoFormContainer'),
        todoId             : document.querySelector('#todoId'),
        todoLegend         : document.querySelector('#todoFormContainer legend'),
        todoName           : document.querySelector('#todoItemName'),
        todoListContainer  : document.querySelector('#todoListContainer'),
        userName           : document.querySelector('#userName')
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

    app.refreshButton.addEventListener('click', function(event) {
        event.preventDefault();
        app.getList();
    });


    /**
     * Handle the click event for the cancel link on the add/edit form
     */
    app.cancelTodo.addEventListener('click', function(event) {
        app.todoId.value = '';
        app.todoName.value = '';
        app.todoCheckbox.checked = false;
        app.todoLegend.innerHTML = '';
        app.todoListContainer.setAttribute('class', '');
        app.todoFormContainer.setAttribute('class', 'hidden');
        app.loginFormContainer.setAttribute('class', 'hidden');
        app.controlsContainer.setAttribute('class', '');
    });


    // online event handling.
    // TODO - Maybe post a message to the service worker?
    app.isOnline = function isOnline() {
        if (navigator.onLine) {
            app.connectionStatus.setAttribute('class', 'online');
        } else {
            app.connectionStatus.setAttribute('class', 'offline');
        }
    };

    window.addEventListener('online', app.isOnline);
    window.addEventListener('offline', app.isOnline);

    app.showLogin = function showLogin() {
        app.loginFormContainer.setAttribute('class', '');
        app.todoListContainer.setAttribute('class', 'hidden');
        app.controlsContainer.setAttribute('class', 'hidden');
        app.todoFormContainer.setAttribute('class', 'hidden');
    };

    app.loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        var user = app.userName.value;
        if (user) {
            localStorage.setItem('todoPWAid', user);
            app.user = user;
            app.getList();
        }
    });

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

                    app.todoListContainer.setAttribute('class', '');
                    app.loginFormContainer.setAttribute('class', 'hidden');
                    app.todoFormContainer.setAttribute('class', 'hidden');
                    app.controlsContainer.setAttribute('class', '');

                    if (response.length) {
                        app.todoListContainer.innerHTML = '';

                        for (i = 0; i < response.length; i++) {
                            var className = response[i].isDone ? 'complete' : 'not-done';
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
                        app.todoListContainer.appendChild(fragment);

                        items = document.querySelectorAll('.editItem');
                        for (i = 0; i < items.length; i++) {
                            items[i].addEventListener('click', function (event) {
                                event.preventDefault();
                                app.editItem(event.currentTarget.id);
                            });
                        }
                    }
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
        app.controlsContainer.setAttribute('class', 'hidden');
        app.todoFormContainer.setAttribute('class', '');
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


    app.start = function start() {
        var user = localStorage.getItem('todoPWAid');
        app.isOnline();
        if (user) {
            app.user = user;
            app.getList();
        } else {
            app.showLogin();
        }
    };



    // Check if the browser supports service worker and background sync!
    if ('serviceWorker' in navigator) {

        // If the app is loaded while offline (or unable to connect to the server)
        // this will result in a very nebulous error that simply says:
        // "An unknown error occurred when fetching the script."
        navigator.serviceWorker
            .register('./serviceworker.js')
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
                        app.getList();
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
                                    app.getList();

                                }).catch(function(err) {
                                    console.error('[app] Error with "sync"', err);
                                });
                            });
                        });
                    });

                } else {
                    console.log('[app] Browser supports service worker, but not sync');

                    // attach the plain old submit handler to the event
                    app.todoForm.addEventListener('submit', app.todoSubmitHandler);
                }
            })
            .catch(function(error) {
                console.log('[app] Error registering service worker: ', error);
            });

    } else {
        console.log('[app] browser does not support service workers');

        // add plain ol' submit event listener here
        app.todoForm.addEventListener('submit', app.todoSubmitHandler);
        app.start();
    }
}());
