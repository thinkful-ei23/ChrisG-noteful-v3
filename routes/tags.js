'use strict';

const express = require('express');
const Note = require('../models/note');
const Tag = require('../models/tag');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (req, res, next) => {
  Tag.find()
    .sort({name: 'asc'})
    .then(result => {
      res.json(result);
    })
    .catch(err => next(err));
});

router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Tag.findById(id)
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => next(err));
});

router.post('/', (req, res, next) => {
  const { name } = req.body;
  if (!name) {
    const err = new Error('Missing name in request body');
    err.status = 400;
    return next(err);
  }
  const newTag = { name };
  Tag.create(newTag)
    .then(result => res.location(`${req.originalUrl}/${result.id}`).status(201).json(result))
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    const err = new Error('Missing name in request body');
    err.status = 400;
    return next(err);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  const updateItem = { name };

  Tag.findByIdAndUpdate(id, updateItem, { new: true })
    .then(result => {
      if (result) {
        res.status(201).json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  // ON DELETE SET NULL equivalent
  const TagRemovePromise = Tag.findByIdAndRemove(id);
  // ON DELETE CASCADE equivalent
  // const noteRemovePromise = Note.deleteMany({ TagId: id });

  const noteRemovePromise = Note.updateMany(
    { tags: id },
    { $unset: { tags: '' } }
  );

  Promise.all([TagRemovePromise, noteRemovePromise])
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;