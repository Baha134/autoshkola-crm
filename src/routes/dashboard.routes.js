// src/routes/dashboard.routes.js
const router = require('express').Router()
const auth = require('../middleware/auth')
const { getStats } = require('../controllers/dashboard.controller')

router.get('/', auth, getStats)

module.exports = router
