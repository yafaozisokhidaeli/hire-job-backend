const jwt = require('jsonwebtoken')
require('dotenv').config()

const generateToken = (payload) => {
    const verify = {
        expiresIn: "2d",
        issuer: 'lihat2'
    }
    const token = jwt.sign(payload, process.env.SECRET_KEY, verify)
    return token
}

const generateRefreshToken = (payload) => {
    return new Promise((resolve, reject) => {
        const verify = {
            expiresIn: '7d',
            issuer: 'hiring'
        }
        jwt.sign(payload, process.env.SECRET_KEY, verify, (err, token) => {
            if (!err) {
                resolve(token)
            } else {
                reject(err)
            }
        })
    })
}

module.exports = {
    generateRefreshToken,
    generateToken
}