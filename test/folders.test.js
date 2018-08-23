'use strict';
//use chai library
const chai = require('chai');
const chaiHttp = require('chai-http');
// use mongoose library
const mongoose = require('mongoose');
// get app from server.js  
const app = require('../server');
// require JWT
const JWT = require('jsonwebtoken'); // JWT AKA jsonwebtoken
const { JWT_SECRET } =require('../config');
// get testURI
const { TEST_MONGODB_URI } = require('../config');
const Folder = require('../models/folder');
const User = require('../models/user');
// seed db
const seedFolders = require('../db/seed/folders');
const seedUsers = require('../db/seed/users');

const expect = chai.expect;
chai.use(chaiHttp);


describe('hooks', function () {
  // Define a token and user so it is accessible in the tests
  let token;
  let user;
  // connect to the database before all tests then drop db
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });
  // seed data runs before each test
  beforeEach(function () {
    return Promise.all ([
      // insert Note and User
      User.insertMany(seedUsers),
      Folder.insertMany(seedFolders),
      Folder.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = JWT.sign({ user }, JWT_SECRET, { subject: user.username});
      });
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

  describe('GET /api/folders return all existing folders', function () {
    // 1. Call the database **and** the API
    // 2. Wait for both promises to resolve using `Promise.all`
    it('should return all folders in db', function () {

      return Promise.all([
        Folder.find({ userId: user.id }).sort('name'),
        chai.request(app).get('/api/folders').set('Authorization', `Bearer ${token}`)
      ])
        // 3. then compare database results to API response
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list with the correct right fields', function () {
      const dbPromise = Folder.find({ userId: user.id }); // <<== Add filter on User Id
      const apiPromise = chai.request(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${token}`); // <<== Add Authorization header

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          res.body.forEach(function (item) {
            expect(item).to.be.a('object');
            expect(item).to.have.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');  // <<== Update assertion
          });
        });
    });

  });
  // erroor for ID is null
  describe('GET /api/folders/:id', function () {
    it('should return correct folder', function () {
      let data;
      // first call database
      return Folder.findOne()
        .then(_data => {
          data = _data;
          // error may occur here may not need V below
          return chai.request(app).get(`/api/folders/${data.id}`).set('Authorization', `Bearer ${token}`);
        }).then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');

          // 3) then compare database results to API response
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });
    it('should return 400 for invalid id', function () {
      let res;
      let invalidId = 'NOt-A-VALID-ID';
      return chai.request(app).get(`/api/folders/${invalidId}`).set('Authorization', `Bearer ${token}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.eq('The `id` is not valid');
        });
    });
    it('should respond with a 404 for an id that does not exist', function () {
      let res;
      let invalidId = 'DOESNOTEXIST';
      return chai.request(app).get(`/api/folders/${invalidId}`).set('Authorization', `Bearer ${token}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(404);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
        });
    });


  });
  // POST
  describe('POST /api/folders', function () {
    it('should create and return a new item when provided valid data', function () {
      const newItem = {
        'name': 'School'
      };
      let res;

      // 1) First, call the API
      return chai.request(app).post('/api/folders').send(newItem).set('Authorization', `Bearer ${token}`)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'name', 'createdAt', 'updatedAt', "userId");
          // mongo should have created id on insertion
          expect(res.body.id).to.not.be.null;
          expect(res.body.name).to.equal(newItem.name);
          // 2) then call the database
          return Folder.findById(res.body.id);
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
    it('should return error when missing name field', function () {
      const newItem = {
        'content': 'sgsegsdhrhaharghehaeharhehaehah'
      };

      return chai.request(app).post('/api/folders')
        .send(newItem).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Missing name in request body');
        });
    });
  
    it('should reuturn an error when given a duplicate name', function () {
      return Folder.findOne()
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app).post('/api/folders').send(newItem).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The folder name already exists');
        });
    });
  });

  // // ADD PUT
  describe('PUT /api/folders/:id', function () {
    it('should update correct fields into folder', function () {
      let updateFolder = {
        name: 'New folder name'
      };
      // first call database
      let data;
      return Folder.findOne()
        .then(_data => {
          data = _data;
 
          return chai.request(app)
            .put(`/api/folders/${_data.id}`)
            .send(updateFolder).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'name', 'createdAt', 'updatedAt', "userId");

          // 3) then compare database results to API response
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateFolder.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });
    
    it('should respond with status 400 and an error message when id is not valid', function () {
      const updateFolder = { 'name': 'valid not test'};

      return chai.request(app)
        .put('/api/folders/DOES-Not-exist')
        .send(updateFolder).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not valid');
        });
    });

    it('should respond with status 404 and an error message when id does note exist', function () {
      const updateFolder = { 'name': 'valid not test' };

      return chai.request(app)
        .put('/api/folders/DOESNotexist')
        .send(updateFolder).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return 400 error when name field missing', function () {
      const updateData = {
        'content': 'Lharehearhehaeheaheahehahah.'
      };
      return Folder.findOne()
        .then(_data => {
          updateData.id = _data.id;
          // console.log(_data.id);
          // error may occur because added /api/folders
          return chai.request(app)
            .put(`/api/folders/${_data.id}`)
            .send(updateData).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          // console.log(res);
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('Missing name in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.find().limit(2)
        .then(result => {
          const [item1, item2] = result;
          item1.name = item2.name;
          return chai.request(app).put(`/api/folders/${item1.id}`).send(item1).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The folder name already exists');
        });
    });
  });

  //DELETE
  describe('DELETE data at indicated ID', function () {
    it('delete folders by id', function () {
      let data;

      return Folder.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/folders/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Folder.findById(data.id);
        })
        .then(res => {
          expect(res).to.be.null;
        });
    });
  });

});