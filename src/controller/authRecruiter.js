require("dotenv").config()
const common = require('../helper/common')
const { authModel } = require('../models/authRecruiter')
const createError = require("http-errors")
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { v4: uuid4 } = require('uuid')
const jwt = require('jsonwebtoken')
const authHelper = require('../helper/auth')
const sendEmail = require('../utils/email/sendEmail')
const uploadGoogleDrive = require('../utils/uploadGoogleDrive')
const deleteGoogleDrive = require('../utils/deleteGoogleDrive')
const deleteFile = require('../utils/delete')
const activateAccountEmail = require('../utils/email/activateAccountEmail')


const authRecruiter = {
    loginRecruiter: async (req, res, next) => {
        try {
            const { email, password } = req.body
            const {
                rows: [user]
            } = await authModel.findEmail(email)
            // console.log(user)
            // console.log(user.active)
            if (!user) {
                return common.response(
                    res,
                    null,
                    'email Anda salah',
                    403
                )
            }
            // else if (user.active !== 'true') {
            //     return common.response(res, null, "please activation account", 403)
            // }
            const validPassword = bcrypt.compareSync(password, user.password)
            if (!validPassword) {
                return common.response(
                    res,
                    null,
                    'password Anda salah',
                    403
                )
            }
            delete user.password
            const payload = {
                email: user.email,
                id: user.id,
                fullname: user.fullname,
                phonenumber: user.phonenumber,
                company: user.company,
                position: user.position,
                role: user.role
            }
            user.token = authHelper.generateToken(payload)
            const newRefreshToken = await authHelper.generateRefreshToken(payload)
            const data = {
                email,
                id: user.id,
                fullname: user.fullname,
                phonenumber: user.phonenumber,
                company: user.company,
                position: user.position,
                role: user.role,
                token: user.token,
                refreshToken: newRefreshToken,
            }
            common.response(res, data, 'Login success', 200)
        } catch (err) {
            console.log(err)
            // next(createError)
        }
    },

    registerRecruiter: async (req, res, next) => {
        try {
            const { fullname, password, email, company, phonenumber, position } = req.body;
            console.log(password)
            const salt = bcrypt.genSaltSync(10)
            console.log(salt)
            const passwordHash = bcrypt.hashSync(password, salt)
            const role = 'recruiter';
            const active = crypto.randomBytes(30).toString('hex');

            const data = {
                id: uuid4(),
                email,
                password: passwordHash,
                fullname,
                company,
                phonenumber,
                position,
                role,
                active
            }
            console.log(data)
            const { rowCount } = await authModel.findEmail(email)
            const templateEmail = {
                from: `"Hire Jobs" <${process.env.EMAIL_FROM}>`,
                to: req.body.email.toLowerCase(),
                subject: 'Activate Your Account!',
                html: activateAccountEmail(`${process.env.PORT_BACKEND}/authRecruiter/activation/${active}`)
            }
            if (rowCount) {
                return common.response(res, rowCount, 'user sudah terdaftar', 403)
            } else {
                const emails = await sendEmail(templateEmail);
                if (emails) {
                    await authModel.create(data)
                    //use smpt
                    common.response(res, null, "Register Success, check email to Activate account", 201)
                    // not use smpt
                    // common.response(res, null, "Register Success, please login", 201)
                } else {
                    common.response(res, null, "Register Success", 201)

                }
                // await authModel.create(data)
                // common.response(res, {
                //     id: uuid4(),
                //     email,
                //     fullname,
                //     company,
                //     phonenumber,
                //     position,
                //     role
                // },
                // 'resgister Success', 201)
            }
        } catch (error) {
            console.log(error)
            // next(createError)
        }
    },
    activate: async (req, res, next) => {
        try {
            const { token } = req.params;
            console.log(token)
            const user = await authModel.findByToken('active', token)
            console.log(user.rowCount)
            if (!user.rowCount) {
                res.send(
                    `<div>
                    <h1>Activation Failed </h1>
                    <h3>Token invalid </h3> 
                </div>`
                )
                return;
            }
            console.log(user.rows[0].id)
            await authModel.activateEmail(user.rows[0].id)
            res.send(
                `<div>
                    <h1>Activation Success </h1>
                    <a href='${process.env.API_FRONTEND}/Login/recruiter'><button class="btn btn-primary">Login Hire Jobs</button></a> 
                </div>`
            )
        } catch (error) {
            console.log(error)
        }
    },
    profil: async (req, res, next) => {
        try {
            const token = req.headers.authorization.split(' ')[1]
            console.log(token)
            const decoded = jwt.verify(token, process.env.SECRET_KEY)
            console.log(decoded)
            const user = await authModel.getProfile(decoded.id)
            console.log(user.rows)
            delete user.password
            common.response(res, user.rows, `Profile ${user.fullname}`, 200)
        } catch (error) {
            console.log(error)
            // next(createError)
        }
    },
    updateImg: async (req, res, next) => {
        try {
            const email = req.decoded.email;
            console.log(email)
            const user = await authModel.findEmail(email);
            console.log(user)
            // jika user tidak ditemukan
            if (!user.rowCount) {
                // hapus jika ada upload photo
                if (req.files) {
                    if (req.files.image) {
                        deleteFile(req.files.image[0].path);
                    }
                }

                return common.response(res, null, "update Profile failed", 404);
            }

            let { image } = user.rows[0];
            console.log(image)
            // console.log(user.rows[0])
            // jika ada upload photo
            console.log(req.files)
            // if (req.files) {
            //     if (req.files.image) {
            //         // menghapus image sebelumnya di gd jika sebelumnya sudah pernah upload
            //         console.log(req.files.image)
            //         if (user.rows[0].image) {
            //             await deleteGoogleDrive(user.rows[0].image);
            //         }
            //         // upload photo baru ke gd
            //         console.log("ini image", req.files.image[0].path)
            //         image = await uploadGoogleDrive(req.files.image[0]);
            //         // menghapus image setelah diupload ke gd
            //         deleteFile(req.files.image[0].path);
            //     }
            // }
            console.log(image, 'ini id')
            await authModel.updatePicture(user.rows[0].id, image.id);

            common.response(res, {
                code: 200,
                payload: null,
                message: 'Update Photo Success',
            }, 'success', 200);
        } catch (error) {
            console.log(error.message)
            common.response(res, {
                code: 500,
                payload: error.message,
                message: 'Internal Server Error',
            }, 'error', 200);
        }
    },
    updateProfile: async (req, res, next) => {
        try {
            const id = req.decoded.id
            console.log(req.decoded)
            const {
                // fullname,
                company_field,
                address,
                company_description,
                email,
                instagram,
                linkedin,
                phonenumber,
                company,
                // position
            } = req.body;
            // const ress = await cloudinary.uploader.upload(picture)
            const data = {
                // fullname,
                company_field,
                address,
                company_description,
                email,
                instagram,
                linkedin,
                phonenumber,
                company,
                // position
            }
            console.log(data)
            authModel.updateProfile({ ...data, id })
                .then(() => {
                    common.response(res, data, 'Updated Profile', 200)
                })
                .catch((err) => {
                    console.log(err)
                    // next(createError)
                })
        } catch (error) {
            console.log(error)
            // next(createError)
        }
    },
    refreshToken: async (req, res, next) => {
        try {
            const refreshToken = req.body.refreshToken
            const decoded = await jwt.verify(refreshToken, process.env.SECRET_KEY)
            console.log(decoded)
            const newPayload = {
                email: decoded.email,
                name: decoded.name,
                role: decoded.role
            }

            const newToken = await authHelper.generateToken(newPayload)
            const newRefreshToken = await authHelper.generateRefreshToken(newPayload)
            const result = {
                token: newToken,
                refreshToken: newRefreshToken
            }
            common.response(res, result, 'Token berhasil di refres', 200)
        } catch (error) {
            console.log(error)
            if (error && error.name === "TokenExpiredError") {
                next(createError(400, 'token invalid'))
            } else if (error && error.name === "JsonWebTokenError") {
                next(createError(400, 'token invalid'))
            } else {
                next(createError(400, 'token not active'))
            }
        }
    },
    changePassword: (req, res, next) => {
        console.log(req.body)
        authModel
            .changePassword(req.body)
            .then(() => {
                res.json({
                    message: 'Password updated'
                })
            })
            .catch((_error) => {
                next(createError)
            })
    }
}

module.exports = {
    authRecruiter
}