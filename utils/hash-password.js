'use strict';

const bcrypt = require('bcryptjs');
const password = 'eyeball';

// Hash a paswword with cost factor 10 then run compare
bcrypt.hash(password, 10)
  .then(hash => {
    console.log('hashed', hash);
    return hash;
  })
  .then(hash => {
    return bcrypt.compare(password, hash);
  })
  .then(valid => {
    console.log('isValid:', valid);
  })
  .catch(err => {
    console.error('error', err);
  });