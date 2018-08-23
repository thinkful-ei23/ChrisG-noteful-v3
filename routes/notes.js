'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');

const router = express.Router();

// Protects endpoints
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

// validate folders
function validateFolders(folderId, userId) {
  if (folderId === undefined) {
    return Promise.resolve();
  }
  // checks if folderId is valid objectId and belongs to current user
  if (!mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  return Folder.count({ _id: folderId, userId })
    .then(count => {
      if (count === 0) {
        const err = new Error('The `folderId` is not valid');
        err.status = 400;
        return Promise.reject(err);
      }
    });

}

function validateTags(tags, userId) {
  if (tags === undefined) {
    return Promise.resolve();
  }
  // checks to see if tags is array
  if (!Array.isArray(tags)) {
    const err = new Error('The `tags` property must be an Array');
    err.status = 400;
    return Promise.reject(err);
  }
  if (tags) {
    tags.forEach(tagId => {
      if (!mongoose.Types.ObjectId.isValid(tagId)) {
        const err = new Error('The `tag` is not valid');
        err.status = 400;
        return Promise.reject(err);
      }
    });
  }
  return Tag.find( {$and: [{ _id: { $in: tags }, userId }]})
    .then(count => {
      if (count === 0) {
        const err = new Error('The `folderId` is not valid');
        err.status = 400;
        return Promise.reject(err);
      }
    });
}

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm , folderId, tagId} = req.query;
  const userId = req.user.id;

  let filter = { userId };
  if(folderId) {
    filter.folderId = folderId;
  }
  if(tagId) {
    filter.tags = tagId;
  }
  if (searchTerm) {
    filter = {$or: [
      {title: { $regex: searchTerm, $options: 'i' }},
      {content: { $regex: searchTerm, $options: 'i' }},
    ]
    };
  }
  Note.find(filter).sort({ updatedAt: 'desc' })
    .populate('tags')
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
  const userId = req.user.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  // why add _id
  Note.findOne({ _id: id, userId })
    .populate('tags')
    .then(results => {
      if (results) {
        res.json(results);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });

});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags } = req.body;
  const userId = req.user.id;
  if (!title) {
    const err = new Error('Missing title in request body');
    err.status = 400;
    return next(err);
  }
  
  const newItem = {
    title,
    content,
    folderId,
    tags,
    userId
  };
  Promise.all([
    validateFolders(folderId, userId),
    validateTags(tags, userId)
  ])
    .then(() => {
      return Note.create(newItem)
        .then(results => res.location(`${req.originalUrl}/${results.id}`).status(201).json(results));
        
    })  
    .catch(err => {
      next(err); 
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {

  const id = req.params.id;
  const userId = req.user.id;
  const { title, content, folderId, tags } = req.body;
  // const UpdateItem = {
  //   title: req.body.title,
  //   content: req.body.content,
  //   folderId: req.body.folderId
  // };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  if (!title) {
    const err = new Error('Missing title in request body');
    err.status = 400;
    return next(err);
  }
  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }
  if (tags) {
    tags.forEach(element => {
      if (tags && !mongoose.Types.ObjectId.isValid(element)) {
        const err = new Error('The `tag` is not valid');
        err.status = 400;
        return next(err);
      }
    });
  }
  const updateItem = { title, content, folderId, tags, userId };
  Promise.all([
    validateFolders(folderId, userId),
    validateTags(tags, userId)
  ])
    .then(() => {
      return Note.findOneAndUpdate( { _id: id, userId }, updateItem, { new: true, upsert: true })
        .then(results => {
          if (results) {
            res.status(201).json(results);
          } else {
            next();
          }
        });
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const id = req.params.id;
  const userId = req.user.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  Note.findOneAndRemove({ _id: id, userId })
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;