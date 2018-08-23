'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return User.createIndexes();
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET /api/folders return all existing folders', function () {
    describe('POST', function () {
      it('Should create a new user', function () {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function () {
        const testUser = { password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal(`Missing username`);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('username');
          });
      });
      // CHECKS FOR PASSWORD
      it('Should reject users with missing password', function () {
        const testUser = { username, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal(`Missing password`);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('password');
          });
      });
      // REJECT NON STRING UserNames
      it('Should reject users with non-string username', function () {
        const testUser = { username: 986, password: 'existsIthink', fullname: 'sterlingArcher' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Incorrect field type: expected string');
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('username');
          });
      });
      // CHECKS FOR NON STRING PASS
      it('Should reject users with non-string password', function () {
        const testUser = { username: 'bobusertwo', password: 123, fullname: 'sterlingArcher' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Incorrect field type: expected string');
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('password');
          });
      });

      it('Should reject users with non-trimmed username', function () {
        const testUser = { username: ' blankspace  ', password: 'existsIthink', fullname: 'sterlingArcher' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Cannot start or end with whitespace');
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('username');
          });
      });

      it('Should reject users with non-trimmed password', function () {
        const testUser = { username: 'noblackspace', password: '  blankspace  ', fullname: 'sterlingArcher' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Cannot start or end with whitespace');
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('password');
          });
      });

      it('Should reject users with empty username', function () {
        const testUser = { username: '', password: 'existsIthink', fullname: 'sterlingArcher' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Must be at least 1 characters long');
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('username');
          });
      });

      it('Should reject users with password less than 8 characters', function () {
        const testUser = { username: 'blankspace', password: '', fullname: 'sterlingArcher' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Must be at least 8 characters long');
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('password');
          });
      });

      it('Should reject users with password greater than 72 characters', function () {
        const testUser = { username: 'blankspace', password: new Array(75).fill('z').join(''), fullname: 'sterlingArcher' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Must be at most 72 characters long');
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.location).to.equal('password');
          });
      });
      it('Should reject users with duplicate username', function () {
        return User.create({
          username,
          password,
          fullname
        })
          .then(() => 
            chai.request(app).post('/api/users').send({
              username,
              password,
              fullname
            })
          )
          // .then(() => expect.fail(null, null, 'Request should not succeed'))
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }
            const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal('Username already taken');
            expect(res.body.location).to.equal('username');
          });
      });
      it('Should trim fullname', function () {
        const testUser = { username, password, fullname: ' trimMe ' };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');
            expect(res.body.username).to.equal(username);
            expect(res.body.fullname).to.equal('trimMe');
            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.not.be.null;
            expect(user.fullname).to.equal('trimMe');
          });
      });
    });
  });
});