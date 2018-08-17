'use strict';

const express = require('express');
const Note = require('../models/note');
const mongoose = require('mongoose');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm , folderId} = req.query;
  let filter = {};
  if(folderId) {
    filter.folderId = folderId;
  }
  if (searchTerm) {
    filter = {$or: [
      {title: { $regex: searchTerm, $options: 'i' }},
      {content: { $regex: searchTerm, $options: 'i' }},
    ]
    };
  }
  Note.find(filter).sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });

});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {

  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
    
  Note.findById(id)
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });

});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const newItem = {
    title: req.body.title,
    content: req.body.content,
    folderId: req.body.folderId
  };

  if (!newItem.title) {
    const err = new Error('Missing title in request body');
    err.status = 400;
    return next(err);
  }
  if (newItem.folderId && !mongoose.Types.ObjectId.isValid(newItem.folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.create(newItem)
    .then(results => res.location(`${req.originalUrl}/${results.id}`).status(201).json(results))
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      next(err); 
    });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {

  const id = req.params.id;
  const UpdateItem = {
    title: req.body.title,
    content: req.body.content,
    folderId: req.body.folderId
  };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  if (!UpdateItem.title) {
    const err = new Error('Missing title in request body');
    err.status = 400;
    return next(err);
  }
  if (UpdateItem.folderId && !mongoose.Types.ObjectId.isValid(UpdateItem.folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findByIdAndUpdate(id, UpdateItem, { new: true, upsert: true })
    .then(results => {
      if (results) {
        res.status(201).json(results);
      } else {
        next();
      }
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      next(err);
    });


});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  Note.findByIdAndRemove(id)
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;