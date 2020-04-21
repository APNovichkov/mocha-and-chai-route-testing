require('dotenv').config()
const app = require('../server.js')
const mongoose = require('mongoose')
const chai = require('chai')
const chaiHttp = require('chai-http')
const assert = chai.assert

const ObjectID = require('mongodb').ObjectID

const User = require('../models/user.js')
const Message = require('../models/message.js')

chai.config.includeStack = true

const expect = chai.expect
const should = chai.should()
chai.use(chaiHttp)

const SAMPLE_USER_ID = 'aaaaaaaaaaaa' // 12 byte string
const SAMPLE_MESSAGE_ID = 'bbbbbbbbbbbb'
const SAMPLE_MESSAGE_ID2 = 'cccccccccccc'

/**
 * root level hooks
 */
after((done) => {
  // required because https://github.com/Automattic/mongoose/issues/1251#issuecomment-65793092
  mongoose.models = {}
  mongoose.modelSchemas = {}
  mongoose.connection.close()
  done()
})


describe('Message API endpoints', () => {
    beforeEach((done) => {
        const sampleUser = new User({
            username: 'myuser',
            password: 'mypassword',
            _id: SAMPLE_USER_ID
        })

        const sampleMessage = new Message({
            title: "Test",
            body: "Testing Body",
            _id: SAMPLE_MESSAGE_ID,
            author: SAMPLE_USER_ID
        })

        Promise.all([sampleUser.save(), sampleMessage.save()])
        .then(() => {
            done()
        })
        .catch(err => {
            throw err.message
        })

    })

    afterEach((done) => {
        const deleteUsers = User.deleteMany({ username: ['myuser', 'anotheruser'] })
        const deleteMessage1 = Message.deleteMany({ title: ["Test", "AnotherTitle", "AnotherTest"]})

        Promise.all([deleteUsers, deleteMessage1])
        .then(() => {
            done()
        }).catch(err => {
            throw err.message
        })
    })

    it('should load all messages', (done) => {
        chai.request(app)
        .get('/messages')
        .end((err, res) => {
            if(err) { done(err) }
            expect(res).to.have.status(200)
            expect(res.body.messages).to.be.an("array")
            done()
        })
    })

    it('should get one specific message', (done) => {
        chai.request(app)
        .get(`/messages/${SAMPLE_MESSAGE_ID}`)
        .end((err, res) => {
            if(err) {done(err)}
            expect(res).to.have.status(200)
            expect(res.body).to.be.an("object")
            expect(res.body.title).to.equal("Test")
            expect(res.body.body).to.equal("Testing Body")
            expect(res.body.author).to.equal(ObjectID(SAMPLE_USER_ID).toString())
            done()
        })
    })

    it('should post a new message', (done) => {
        chai.request(app)
        .post('/messages')
        .send({
            title: "AnotherTitle",
            body: "Another body",
            author: SAMPLE_USER_ID,
            _id: SAMPLE_MESSAGE_ID2
        })
        .end((err, res) => {
            if(err) {done(err)}
            expect(res.body).to.be.an('object')
            expect(res.body).to.have.property('title', 'AnotherTitle')

            Message.findOne({title: 'AnotherTitle'}).then(message => {
                expect(message).to.be.an('object')
                done()
            })
        })
    })

    it('should update a message', (done) => {
        chai.request(app)
        .put(`/messages/${SAMPLE_MESSAGE_ID}`)
        .send({title: 'AnotherTest'})
        .end((err, res) => {
            if(err) {done(err)}
            expect(res.body.message).to.be.an('object')
            expect(res.body.message).to.have.property('title', 'AnotherTest')
            Message.findOne({title: 'AnotherTest'}).then(message => {
                expect(message).to.be.an('object')
                done()
            })
        })
    })

    it('should delete a message', (done) => {
        chai.request(app)
        .delete(`/messages/${SAMPLE_MESSAGE_ID}`)
        .end((err, res) => {
            if(err) {done(err)}
            expect(res.body.message).to.equal('Successfully deleted.')
            expect(res.body._id).to.equal(SAMPLE_MESSAGE_ID)

            Message.findOne({title: 'Test'}).then(message => {
                expect(message).to.equal(null)
                done()
            })
        })
    })
})
