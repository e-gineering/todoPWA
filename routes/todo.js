var collection = 'todos';
var express    = require('express');
var Mongo      = require('mongodb').MongoClient;
var ObjectId   = require('mongodb').ObjectID;
var router     = express.Router();
var url        = 'mongodb://localhost:27017/todo';

/**
 * Get the list of "to do" items.
 */
router.get('/todos/:user', function(req, res, next) {
    var user;
    try {
        user = decodeURIComponent(req.params.user);
        Mongo.connect(url, function (err, db) {
            var items = [];
            var cursor = db.collection(collection).find({ user : user });
            cursor.each(function (err, doc) {
                if (doc === null) {
                    db.close();
                    res.header('Content-Type', 'application/json');
                    res.status(200).send(JSON.stringify(items));
                } else {
                    items.push(doc);
                }
            });
        });
    } catch (error) {
        console.log(error);
        res.header('Content-Type', 'application/json');
        res.status(500).send();
    }
});

/**
 * Get a specified "to do" item.
 */
router.get('/todo/:id', function(req, res, next) {
    var id;
    try {
        id = new ObjectId(req.params.id);
        Mongo.connect(url, function (err, db) {
            db.collection(collection)
                .findOne(
                    {'_id': id},
                    function (err, doc) {
                        db.close();
                        res.header('Content-Type', 'application/json');
                        res.status(200).send(JSON.stringify(doc));
                    }
                );
        });

    } catch (error) {
        console.log(error);
        res.header('Content-Type', 'application/json');
        res.status(500).send();
    }
});

/**
 * Create a new "to do" item.
 */
router.post('/todo', function(req, res, next) {
    var todoItem = req.body;

    // just in case the _id exists and is empty...
    delete todoItem._id;

    Mongo.connect(url, function(err, db) {
        db.collection(collection)
          .insertOne(todoItem, function(error, result) {
              db.close();
              res.header('Content-Type','application/json');
              res.status(200).send(JSON.stringify(todoItem));
        });
    });
});

/**
 * Update the specified "to do" item.
 */
router.put('/todo/:id', function(req, res, next) {
    var id       = req.params.id;
    var todoItem = req.body;

    // Without this, Mongo complained. It seems to work.
    delete todoItem._id;

    Mongo.connect(url, function(err, db) {
        db.collection(collection).replaceOne(
            {'_id' : new ObjectId(id)}, todoItem,
            function(err, results) {
                db.close();
                res.header('Content-Type','application/json');
                res.status(200).send(JSON.stringify(todoItem));
            }
        );
    });
});

/**
 * Delete the specified item
 */
router.delete('/todo/:id', function(req, res, next) {
    var id = req.params.id;
    Mongo.connect(url, function(err, db) {
        db.collection(collection).deleteOne(
            {'_id' : new ObjectId(id)},
            function(err, results) {
                db.close();
                res.header('Content-Type','application/json');
                res.status(200).send();
            }
        );
    });
});

module.exports = router;