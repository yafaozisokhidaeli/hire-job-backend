const express = require('express');
const Router = express.Router()
const { authRecruiter } = require('../controller/authRecruiter');
const upload = require('../middlewares/uploadfile');
const protect = require("../middlewares/auth")

Router
    .post('/login', authRecruiter.loginRecruiter)
    .post('/register', authRecruiter.registerRecruiter)
    .get('/profile', protect, authRecruiter.profil)
    .get('/activation/:token', authRecruiter.activate)
    .post('/refreshToken', authRecruiter.refreshToken)
    .put('/changePassword', authRecruiter.changePassword)
    .put(
        '/update-profile/img',
        protect,
        upload,
        authRecruiter.updateImg
    )
    .put(
        '/update-profile',
        protect,
        authRecruiter.updateProfile
    )

module.exports = Router