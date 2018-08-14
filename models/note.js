'use strict';

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String
});

// Add `createdAt` and `updatedAt` fields
noteSchema.set('timestamps', true);
// Remember, the name you pass to the mongoose.model() method 
// is used to create the lowercase and 
// pluralized collection in Mongo.
// it will be saved as notes collection in database
noteSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content
  };
};

module.exports = mongoose.model('Note', noteSchema);