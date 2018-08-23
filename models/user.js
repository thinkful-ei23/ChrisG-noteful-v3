'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  fullname: String,
  username: { type: String, require: true, unique: true},
  password: { type: String, require: true}
});

userSchema.set('toObject', {
  virtuals: true,
  versionKey: false, 
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.password;
  }
});
// will update soon with async hashing
userSchema.methods.validatePassword = function (password) {
  // return password === this.password;
  // added bycript
  return bcrypt.compare(password, this.password);
};
userSchema.statics.hashPassword = function (password) {
  // return password === this.password;
  // added bycript
  return bcrypt.hash(password, 10);
};

module.exports = mongoose.model('User', userSchema);