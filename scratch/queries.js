'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Note = require('../models/note');

mongoose.connect(MONGODB_URI)
  .then(() => {
    const searchTerm = 'Lady Gaga';
    let titleFilter = {};
    let contentFilter = {};
    if (searchTerm) {
      titleFilter.title = { $regex: searchTerm };
      contentFilter.content = { $regex: searchTerm };
    }

    return Note.find({ $or: [titleFilter, contentFilter]}).sort({ updatedAt: 'desc' });
  })
  .then(results => {
    console.log(results);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });

// *********************************** find by id
// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     const id = '000000000000000000000006';
    
//     return Note.findById(id);
//   })
//   .then(results => console.log(results))
//   .then(() => { 
//     return mongoose.disconnect(); 
//   })
//   .catch(err => console.error(`ERROR: ${err.message}`));

//*****************************************create */
// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     const newItem = {
//       title: 'My new news idea',
//       content: 'sgskjhgjsgejsjhsghegs'
//     };

//     return Note.create(newItem);
//   })
//   .then(results => console.log(results))
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => console.error(`ERROR: ${err.message}`));

// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     const id = '000000000000000000000006';
//     const UpdateItem = {
//       title: '9 reasons Dogs are better than cats',
//       content: 'It just did that is what I heard abnd it sounds pretty reasobable aye?',
//     };
//     return Note.findByIdAndUpdate(id, UpdateItem, { new: true, upsert:true });
//   })
//   .then(results => console.log(results))
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => console.error(`ERROR: ${err.message}`));

// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     const id = '5b73380d855d684f244679c9';
  
//     return Note.findByIdAndRemove(id);
//   })
//   .then(results => console.log(results))
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => console.error(`ERROR: ${err.message}`));
