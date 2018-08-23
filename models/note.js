'use strict';

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  folderId: {type: mongoose.Schema.Types.ObjectId, ref: 'Folder'},
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// noteSchema.index({ name: 1, userId: 1 });

// Add `createdAt` and `updatedAt` fields
noteSchema.set('timestamps', true);
// Remember, the name you pass to the mongoose.model() method 
// is used to create the lowercase and 
// pluralized collection in Mongo.
// it will be saved as notes collection in database

noteSchema.set('toObject', {
  virtuals: true,  //include built-in virtual id 
  versionKey: false, //remove __v version key 
  transform: (doc, ret) => { 
    delete ret._id; // delete _id 
  }});


module.exports = mongoose.model('Note', noteSchema);