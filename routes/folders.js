'use strict';

const express = require('express');
const Folder = require('../models/folder');
const Note = require('../models/note');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (req, res, next) => {

  Folder.find()
    .sort({name: 'asc'})
    .then(function(result) {
      res.json(result);
    })
    .catch(err => next(err));
});

router.get('/:id', (req, res, next) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Folder.findById(id)
    .then(result => {
      if(result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

router.post('/', (req, res, next) => {
  const { name } = req.body;
  if (!name) {
    const err = new Error('Missing name in request body');
    err.status = 400;
    return next(err);
  }
  const newFolder = { name };
  Folder.create(newFolder)
    .then(result => res.location(`${req.originalUrl}/${result.id}`).status(201).json(result))
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
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
  
  Folder.findByIdAndUpdate(id, updateItem, {new:true})
    .then(result => {
      if (result) {
        res.status(201).json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
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
  const folderRemovePromise = Folder.findByIdAndRemove(id);
  // ON DELETE CASCADE equivalent
  // const noteRemovePromise = Note.deleteMany({ folderId: id });

  const noteRemovePromise = Note.updateMany(
    { folderId: id },
    { $unset: { folderId: '' } }
  );

  Promise.all([folderRemovePromise, noteRemovePromise])
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;