'use strict';

const express = require('express');
const User = require('../models/user');
const passport = require('passport');

const router = express.Router();

router.post('/', (req, res, next) => {
  const { fullname, username, password } = req.body;
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: `Missing ${missingField}`,
      location: `${missingField}`
    });
  }
  const stringFields = ['username', 'password', 'firstName', 'lastName'];
  const nonStringField = stringFields.find(
    field => field in req.body && typeof req.body[field] !== 'string'
  );

  if (nonStringField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Incorrect field type: expected string',
      location: `${nonStringField}`
    });
  }

  const explicityTrimmedFields = ['username', 'password'];
  const nonTrimmedField = explicityTrimmedFields.find(
    field => req.body[field].trim() !== req.body[field]
  );

  if(nonTrimmedField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Cannot start or end with whitespace',
      location: `${nonTrimmedField}`
    });
  }

  const minMaxSize = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    }
  };

  const tooSmallField = Object.keys(minMaxSize).find(
    field => 'min' in minMaxSize[field] && req.body[field].trim().length < minMaxSize[field].min
  );
  const tooLargeField = Object.keys(minMaxSize).find(
    field => 'max' in minMaxSize[field] && req.body[field].trim().length > minMaxSize[field].max
  );

  if(tooSmallField || tooLargeField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: tooSmallField ? `Must be at least ${minMaxSize[tooSmallField].min} characters long` : `Must be at most ${minMaxSize[tooLargeField].max} characters long`,
      location: tooSmallField || tooLargeField
    });
  }

  // check for existing user
  return User.find({ username })
    .count()
    .then(count => {
      if (count > 0) {
        return Promise.reject({
          code: 422,
          reason: 'ValidationError',
          message: 'Username already taken',
          location: 'username'
        });
      }
      return User.hashPassword(password);
    })
    .then(hash => {
      const newUser = {
        fullname: fullname.trim(),
        username,
        password: hash
      };
      return User.create(newUser);
    })
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({ code: 500, message: 'Internal server error' });
    });
});

module.exports = router;