'use strict';
const express = require('express');
const passport = require('passport');
const config = require('../config');

const router = express.Router();

const JWT = require('jsonwebtoken'); // JWT AKA jsonwebtoken
const { JWT_SECRET, JWT_EXPIRY } = config;

const options = { session: false, failWithError: true };
const localAuth = passport.authenticate('local', options); // could also add { session : false } as second perameter
// exchange old tokens for new ones
const jwtAuth = passport.authenticate('jwt', options);

function createAuthToken (user) {
  return JWT.sign({user}, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
    // alogrithm: 'HS256'
  });
}
// ADD here to??????????????????????????
// router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));
router.post('/', localAuth, function (req, res ) {
  // Creates token for each user
  const authToken = createAuthToken(req.user);
  // MAYBE DOESNT NEED RETURN
  return res.json({ authToken });
});

router.post('/refresh', jwtAuth, (req,res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

module.exports = router;