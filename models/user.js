'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: String,
  username: { type: String, require: true, unique: true},
  password: { type: String, require: true}
});

userSchema.set('timestamps', true);

userSchema.set('toObject', {
  virtuals: true,
  versionKey: false, 
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.password;
  }
});
module.exports = mongoose.model('User', userSchema);