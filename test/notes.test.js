'use strict';
//use chai library
const chai = require('chai');
const chaiHttp = require('chai-http');
// use mongoose library
const mongoose = require('mongoose');
// get app from server.js                              **********ASK ABOUT dot dot in ../server
const app = require('../server');
// get testURI
const { TEST_MONGODB_URI } = require('../config');
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
// seed db
const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');

const expect = chai.expect;
chai.use(chaiHttp);


describe('Node noteful notes test', function () {
  // connect to the database before all tests then drop db
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });
  // seed data runs before each test
  beforeEach(function () {
    return Promise.all([
      Folder.insertMany(seedTags),
      Folder.createIndexes(),
      Tag.insertMany(seedFolders),
      Tag.createIndexes(),
      Note.insertMany(seedNotes)
    ]);
  });
  // drop database after each test
  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });
  // disconnects after all test
  after(function () {
    return mongoose.disconnect();
  });


  // 1. First, call the API to insert the document 
  // 2. then call the database to retrieve the new document
  // 3. then compare the API response to the database results

  describe('GET /api/notes return all existing notes', function () {
  // 1. Call the database **and** the API
  // 2. Wait for both promises to resolve using `Promise.all`
    it('should return all notes in db', function() {
      
      return Promise.all([
        Note.find(),
        chai.request(app).get('/api/notes')
      ])
      // 3. then compare database results to API response
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });
    
    it('should return correct note when passed search result', function() {
      let res;
      let data;
      return Note.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).get(`/api/notes?searchTerm=${data.title}`);
        })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.be.an('object');
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'folderId', 'tags', 'createdAt', 'updatedAt');

          // 3) then compare database results to API response
          expect(res.body[0].id).to.equal(data.id);
          expect(res.body[0].title).to.equal(data.title);
          expect(res.body[0].content).to.equal(data.content);
          expect(new Date(res.body[0].createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body[0].updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return empty array for invalid searches', function () {
      let res;
      let invalidSearch = 'Iaminvalid';
      return chai.request(app).get(`/api/notes?searchTerm=${invalidSearch}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(0);
        });
    });
    it('should return an empty array for an incorrect query', function () {
      const searchTerm = 'NotValid';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ 'title': re }, { 'content': re }]
      });
      const apiPromise = chai.request(app).get(`/api/notes?searchTerm=${searchTerm}`);
      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });
  });
  // erroor for ID is null
  describe('GET /api/notes/:id', function() {
    it('should return correct note', function() {
      let data;
      // first call database
      return Note.findOne()
        .then(_data => {
          data =_data;
          // error may occur here may not need V below
          return chai.request(app).get(`/api/notes/${data.id}`);
        }).then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'folderId', 'tags','createdAt', 'updatedAt');

          // 3) then compare database results to API response
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });
    it('should return empty array for invalid searches', function () {
      let res;
      let invalidId = 'ID';
      return chai.request(app).get(`/api/notes/${invalidId}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
        });
    });
    it('should return correct search results for a folderId query', function () {
      let data;
      return Folder.findOne()
        .then((_data) => {
          data = _data;
          return Promise.all([
            Note.find({ folderId: data.id }),
            chai.request(app).get(`/api/notes?folderId=${data.id}`)
          ]);
        })
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });
    
  });
  // POST
  describe('POST /api/notes', function () {
    it('should create and return a new item when provided valid data', function () {
      const newItem = {
        'title': 'The best article about cats ever!',
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };

      let res;
      // 1) First, call the API
      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'tags', 'createdAt', 'updatedAt');
          // mongo should have created id on insertion
          expect(res.body.id).to.not.be.null;
          expect(res.body.title).to.equal(newItem.title);
          expect(res.body.content).to.equal(newItem.content);
          // 2) then call the database
          return Note.findById(res.body.id);
        })
      // 3) then compare the API response to the database results
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });
    it('should return 400 error when missing title', function () {
      const newItem = {
        'content': 'sgsegsdhrhaharghehaeharhehaehah'
      };

      return chai.request(app).post('/api/notes')
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Missing title in request body');
        });
    });
  });

  // // ADD PUT
  describe('PUT /api/notes/:id', function () {
    it('should update correct fields into note', function () {
      let updateData = {
        title: 'This ios the title for my content',
        content: 'sggsefsymcontentf for teh eitkete gietges ithis bable library ipdonm orem'
      };
      // first call database
      return Note.findOne()
        .then(_data => {
          updateData.id = _data.id;
          // console.log(_data.id);
          // error may occur because added /api/notes
          return chai.request(app)
            .put(`/api/notes/${_data.id}`)
            .send(updateData);
        })
        .then((res) => {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'folderId', 'tags','createdAt', 'updatedAt');

          // 3) then compare database results to API response
          expect(res.body.id).to.equal(updateData.id);
          expect(res.body.title).to.equal(updateData.title);
          expect(res.body.content).to.equal(updateData.content);
        });
    });
    it('should return 400 error missing title', function () {
      const updateData = {
        'content': 'Lharehearhehaeheaheahehahah.'
      };
      return Note.findOne()
        .then(_data => {
          updateData.id = _data.id;
          // console.log(_data.id);
          // error may occur because added /api/notes
          return chai.request(app)
            .put(`/api/notes/${_data.id}`)
            .send(updateData);
        })
        .then(res => {
          // console.log(res);
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Missing title in request body');
        });
    });
  });

  //DELETE
  describe('DELETE data at indicated ID', function () {
    it('delete notes by id', function () {
      let data;

      return Note.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/notes/${data.id}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          return Note.findById(data.id);
        })
        .then(res => {
          expect(res).to.be.null;
        });
    });
  });

});