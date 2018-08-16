'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {type: String, required: true, unique: true}
});

// Add `createdAt` and `updatedAt` fields
folderSchema.set('timestamps', true);
// Remember, the name you pass to the mongoose.model() method 
// is used to create the lowercase and 
// pluralized collection in Mongo.
// it will be saved as notes collection in database

folderSchema.set('toObject', {
  virtuals: true,  //include built-in virtual id 
  versionKey: false, //remove __v version key 
  transform: (doc, ret) => {
    delete ret._id; // delete _id 
  }
});

module.exports = mongoose.model('Folder', folderSchema);