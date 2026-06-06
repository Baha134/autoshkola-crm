const router = require('express').Router()
const auth = require('../middleware/auth')
const { getByLead, create, remove } = require('../controllers/lead_events.controller')

router.get('/lead/:leadId', auth, getByLead)
router.post('/', auth, create)
router.delete('/:id', auth, remove)

module.exports = router