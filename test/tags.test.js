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
const { JWT_SECRET } = require('../config');
// get testURI
const { TEST_MONGODB_URI } = require('../config');
const Tag = require('../models/tag');
const User = require('../models/user');
// seed db
const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');

const expect = chai.expect;
chai.use(chaiHttp);


describe('hooks test tags', function () {
  // define token and user
  let token;
  let user;
  // connect to the database before all tests then drop db
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });
  // seed data runs before each test
  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      Tag.insertMany(seedTags),
      Tag.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = JWT.sign({ user }, JWT_SECRET, { subject: user.username });
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

  describe('GET /api/tags return all existing tags', function () {
    // 1. Call the database **and** the API
    // 2. Wait for both promises to resolve using `Promise.all`
    it('should return all tags in db', function () {

      return Promise.all([
        Tag.find({ userId: user.id }).sort('name'),
        chai.request(app).get('/api/tags').set('Authorization', `Bearer ${token}`)
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
      const dbPromise = Tag.find({ userId: user.id }); // <<== Add filter on User Id
      const apiPromise = chai.request(app)
        .get('/api/tags')
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
  describe('GET /api/tags/:id', function () {
    it('should return correct Tag', function () {
      let data;
      // first call database
      return Tag.findOne()
        .then(_data => {
          data = _data;
          // error may occur here may not need V below
          return chai.request(app).get(`/api/tags/${data.id}`).set('Authorization', `Bearer ${token}`);
        }).then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('createdAt', 'id', 'name', 'updatedAt', 'updatedAt');

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
      return chai.request(app).get(`/api/tags/${invalidId}`).set('Authorization', `Bearer ${token}`)
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
      return chai.request(app).get(`/api/tags/${invalidId}`).set('Authorization', `Bearer ${token}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(404);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
        });
    });


  });
  // POST
  describe('POST /api/tags', function () {
    it('should create and return a new item when provided valid data', function () {
      const newItem = {
        'name': 'School'
      };
      let res;

      // 1) First, call the API
      return chai.request(app)
        .post('/api/tags')
        .send(newItem).set('Authorization', `Bearer ${token}`)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('createdAt', 'id', 'name', 'updatedAt', 'updatedAt');
          // mongo should have created id on insertion
          expect(res.body.id).to.not.be.null;
          expect(res.body.name).to.equal(newItem.name);
          // 2) then call the database
          return Tag.findById(res.body.id);
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

      return chai.request(app).post('/api/tags')
        .send(newItem).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Missing name in request body');
        });
    });
    
    it('should reuturn an error when given a duplicate name', function () {
      return Tag.findOne()
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app).post('/api/tags').send(newItem).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The Tag name already exists');
        });
    });
  });

  // // ADD PUT
  describe('PUT /api/tags/:id', function () {
    it('should update correct fields into Tag', function () {
      let updateTag = {
        name: 'New Tag name'
      };
      // first call database
      let data;
      return Tag.findOne()
        .then(_data => {
          data = _data;

          return chai.request(app)
            .put(`/api/tags/${_data.id}`)
            .send(updateTag).set('Authorization', `Bearer ${token}`).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('createdAt', 'id', 'name', 'updatedAt', 'updatedAt');

          // 3) then compare database results to API response
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateTag.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when id is not valid', function () {
      const updateTag = { 'name': 'valid not test' };

      return chai.request(app)
        .put('/api/tags/DOES-Not-exist')
        .send(updateTag).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not valid');
        });
    });

    it('should respond with status 404 and an error message when id does note exist', function () {
      const updateTag = { 'name': 'valid not test' };

      return chai.request(app)
        .put('/api/tags/DOESNotexist')
        .send(updateTag).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return 400 error when name field missing', function () {
      const updateData = {
        'content': 'Lharehearhehaeheaheahehahah.'
      };
      return Tag.findOne()
        .then(_data => {
          updateData.id = _data.id;
          // console.log(_data.id);
          // error may occur because added /api/tags
          return chai.request(app)
            .put(`/api/tags/${_data.id}`)
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
      return Tag.find().limit(2)
        .then(result => {
          const [item1, item2] = result;
          item1.name = item2.name;
          return chai.request(app).put(`/api/tags/${item1.id}`).send(item1).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The Tag name already exists');
        });
    });
  });

  //DELETE
  describe('DELETE data at indicated ID', function () {
    it('delete tags by id', function () {
      let data;

      return Tag.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/tags/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Tag.findById(data.id);
        })
        .then(res => {
          expect(res).to.be.null;
        });
    });
  });

});