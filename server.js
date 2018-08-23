'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
// added passport
const passport = require('passport');
const localStrategy = require('./passport/local');

const { PORT, MONGODB_URI } = require('./config');

const notesRouter = require('./routes/notes');
// added features
const foldersRouter = require('./routes/folders');
const tagsRouter = require('./routes/tags');
const userRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const jwtStrategy = require('./passport/jwt');

// Create an Express application
const app = express();

// Log all requests. Skip logging during
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'common', {
  skip: () => process.env.NODE_ENV === 'test'
}));

// configure passport to use the strategy
passport.use(localStrategy);
// configure PP to utilize jwtStrategy
passport.use(jwtStrategy);

// Create a static webserver
app.use(express.static('public'));

// Parse request body
app.use(express.json());

// Mount routers
// Mount notes
app.use('/api/notes', notesRouter);
// Mount folders
app.use('/api/folders', foldersRouter);
// Mount tags
app.use('/api/tags', tagsRouter);
// Mount users
app.use('/api/users', userRouter);
// Mount auth
app.use('/api/login', authRouter);

// Custom 404 Not Found route handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Custom Error Handler
app.use((err, req, res, next) => {
  if (err.status) {
    const errBody = Object.assign({}, err, { message: err.message });
    res.status(err.status).json(errBody);
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGODB_URI)
    .then(instance => {
      const conn = instance.connections[0];
      console.info(`Connected to: mongodb://${conn.host}:${conn.port}/${conn.name}`);
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      console.error('\n === Did you remember to start `mongod`? === \n');
      console.error(err);
    });

  app.listen(PORT, function () {
    console.info(`Server listening on ${this.address().port}`);
  }).on('error', err => {
    console.error(err);
  });
}
module.exports = app; // Export for testing