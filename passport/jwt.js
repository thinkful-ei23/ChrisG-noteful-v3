'use strict';

const { Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
const config = require('../config');
const { JWT_SECRET } = config;

const options = {
  secretOrKey: JWT_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
  algorithms: ['HS256']
};

const jwtStrategy = new JwtStrategy(options, (payload, done) => {
  done(null, payload.user);
});

module.exports  = jwtStrategy;