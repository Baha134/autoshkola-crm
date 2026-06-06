const router = require('express').Router()
const auth = require('../middleware/auth')
const { getAll, create, remove } = require('../controllers/users.controller')

router.get('/', auth, getAll)
router.post('/', auth, create)
router.delete('/:id', auth, remove)

module.exports = router