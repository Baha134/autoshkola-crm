const router = require('express').Router()
const auth = require('../middleware/auth')
const { getAll, getOne, create, update, remove } = require('../controllers/leads.controller')

router.get('/', auth, getAll)
router.get('/:id', auth, getOne)
router.post('/', auth, create)
router.put('/:id', auth, update)
router.delete('/:id', auth, remove)

module.exports = router