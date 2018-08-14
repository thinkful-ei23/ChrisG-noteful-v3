'use strict';

const express = require('express');
const Note = require('../models/note');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      const { searchTerm } = req.query;
      let titleFilter = {};
      let contentFilter = {};
      if (searchTerm) {
        titleFilter.title = { $regex: searchTerm };
        contentFilter.content = { $regex: searchTerm };
      }
      return Note.find({ $or: [titleFilter, contentFilter] }).sort({ updatedAt: 'desc' });
    })
    .then(results => {
      res.json(results);
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      res.json(err);
    });

});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {

  mongoose.connect(MONGODB_URI)
    .then(() => {
      const id = req.params.id;

      return Note.findById(id);
    })
    .then(results => res.json(results))
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      res.json(err);
    });

});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {

  mongoose.connect(MONGODB_URI)
    .then(() => {
      // const { title, content } = req.body;
      // const newItem = {}
      const newItem = {
        title: req.body.title,
        content: req.body.content
      };

      return Note.create(newItem);
    })
    .then(results => res.json(results))
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      res.json(err); 
    });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {

  mongoose.connect(MONGODB_URI)
    .then(() => {
      const id = req.params.id;
      const UpdateItem = {
        title: req.body.title,
        content: req.body.content,
      };
      return Note.findByIdAndUpdate(id, UpdateItem, { new: true, upsert: true });
    })
    .then(results => res.json(results))
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      res.json(err);
    });


});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {

  mongoose.connect(MONGODB_URI)
    .then(() => {
      const id = req.params.id;

      return Note.findByIdAndRemove(id);
    })
    .then(() => {
      res.status(204).end();
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      res.json(err);
    });
});

module.exports = router;