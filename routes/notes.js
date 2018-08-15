'use strict';

const express = require('express');
const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm } = req.query;
  let titleFilter = {};
  let contentFilter = {};
  if (searchTerm) {
    titleFilter.title = { $regex: searchTerm };
    contentFilter.content = { $regex: searchTerm };
  }
  return Note.find({ $or: [titleFilter, contentFilter] }).sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      res.json(err);
    });

});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {

  const id = req.params.id;
    
  return Note.findById(id)
    .then(results => res.json(results))
    .catch(err => {
      res.json(err);
    });

});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const newItem = {
    title: req.body.title,
    content: req.body.content
  };

  return Note.create(newItem)
    .then(results => res.json(results))
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      res.json(err); 
    });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {

  const id = req.params.id;
  const UpdateItem = {
    title: req.body.title,
    content: req.body.content,
  };
  return Note.findByIdAndUpdate(id, UpdateItem, { new: true, upsert: true })
    .then(results => res.json(results))
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      res.json(err);
    });


});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const id = req.params.id;

  return Note.findByIdAndRemove(id)
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      res.json(err);
    });
});

module.exports = router;